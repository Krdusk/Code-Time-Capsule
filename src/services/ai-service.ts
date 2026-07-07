import { buildContextPrompt, queryRepo, type QueryResult } from "../engine/query-engine";
import type { Answer, Commit, Issue, CiRun, Repository, LiveRepoData } from "../types";

/* ── Greeting detection ─────────────────────────────── */

const GREETING_PATTERNS = [
  /^(hi|hello|hey|greetings|sup|yo|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i,
  /^who\s*are\s*you/i,
  /^what\s*can\s*you\s*do/i,
  /^how\s*are\s*you/i,
];

function isGreeting(question: string): boolean {
  return GREETING_PATTERNS.some((p) => p.test(question.trim()));
}

function buildGreetingResponse(question: string): string {
  const q = question.toLowerCase().trim();
  const greetings = [
    "Hey there! 👋 I'm your repo historian — loaded and ready. Ask me anything about the codebase!",
    "Hello! I've got the data. Drop a question about commits, issues, CI, or contributors.",
    "Hi! 👋 What would you like to explore in this repository today?",
    "Hey! I'm here. Ask me anything about this project's history — I dig deep.",
  ];

  if (/^how\s*are\s*you/i.test(q)) {
    return "I'm sharp and ready! Let's explore some code history together — ask me anything.";
  }

  if (/^what\s*can\s*you\s*do/i.test(q) || /^who\s*are\s*you/i.test(q)) {
    return `I'm **Code Time Capsule's AI** — your codebase historian. Here's what I can do:

- **Explore commits** — ask about changes, authors, or time periods
- **Investigate issues** — find bugs, feature requests, pull requests
- **Check CI health** — pass/fail rates, recent builds
- **Track contributors** — who's been most active
- **Compare periods** — how things changed between months or years

Just ask anything below!`;
  }

  return greetings[Math.floor(Math.random() * greetings.length)];
}

/* ── Google Gemini API ──────────────────────────────── */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey(): string | null {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  return key?.trim() || null;
}

/* ── Build system prompt ────────────────────────────── */

function buildSystemPrompt(repoName: string): string {
  return `You are an expert developer and codebase historian with deep knowledge of the "${repoName}" repository. You are part of Code Time Capsule.

Your job: read the provided evidence context (commits, issues, CI runs, import graph), then answer the user's question with clarity and insight.

Rules:
1. Base your answer ONLY on the evidence provided. Do not make up facts.
2. If the evidence doesn't contain enough to answer, say so clearly.
3. Cite specific commit hashes (first 7 chars), issue numbers (#123), file paths, and CI run IDs where relevant.
4. Be technical and precise — this is for developers.
5. Use markdown formatting: **bold** for emphasis, \`inline code\` for hashes/paths.
6. Be conversational but factual — explain the "why" when you can infer it from the data.
7. Keep answers under 4000 characters.`;
}

/* ── Call Gemini API ────────────────────────────────── */

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

async function callGemini(
  systemPrompt: string,
  userContent: string,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const model = "gemini-2.5-flash";
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: `${systemPrompt}\n\n${userContent}` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    if (res.status === 403 || res.status === 400) {
      throw new Error(`GEMINI_API_ERROR: ${res.status} — ${errText.slice(0, 200)}`);
    }
    throw new Error(`AI_SERVICE_ERROR: ${res.status} — ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || "No response generated.";
}

/* ── Detect repo reference in question ───────────────── */

function detectRepoUrlInQuestion(question: string): { owner: string; repo: string } | null {
  // Full URL: https://github.com/owner/repo
  const urlMatch = question.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)(?:\/|#|\?|$)/
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }
  // Shorthand: owner/repo (e.g. "facebook/react")
  const shortMatch = question.match(
    /(?:\b|^)([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\b(?![@/])/
  );
  if (shortMatch) {
    const owner = shortMatch[1];
    const repo = shortMatch[2];
    // Filter out clearly non-repo patterns (e.g., "there/are", dates, file paths)
    if (
      /^(the|this|that|there|here|these|those|how|what|when|where|why|who|does|did|has|have|was|were|can|could|would|should|will|shall|may|might|must|is|are|am|be|been|being|to|of|in|for|on|with|at|by|from|as|into|through|during|before|after|above|below|between|out|off|over|under|again|further|then|once)$/i.test(owner)
    ) {
      return null;
    }
    return { owner, repo };
  }
  return null;
}

/* ── GitHub Public API fetching ─────────────────────── */

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  files?: { filename: string; additions: number; deletions: number }[];
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: { name: string }[];
  created_at: string;
  pull_request?: unknown;
}

interface GitHubRepoInfo {
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

async function fetchGitHubData(
  owner: string,
  repo: string
): Promise<{ info: GitHubRepoInfo | null; commits: GitHubCommit[]; issues: GitHubIssue[]; languages: Record<string, number> }> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };

  async function fetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  const [info, commits, issues, languages] = await Promise.all([
    fetchJson<GitHubRepoInfo>(`https://api.github.com/repos/${owner}/${repo}`),
    fetchJson<GitHubCommit[]>(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`),
    fetchJson<GitHubIssue[]>(`https://api.github.com/repos/${owner}/${repo}/issues?per_page=10&state=all`),
    fetchJson<Record<string, number>>(`https://api.github.com/repos/${owner}/${repo}/languages`),
  ]);

  return {
    info,
    commits: commits || [],
    issues: issues || [],
    languages: languages || {},
  };
}

function buildGitHubAnswer(
  data: { info: GitHubRepoInfo | null; commits: GitHubCommit[]; issues: GitHubIssue[]; languages: Record<string, number> },
  question: string
): string {
  const { info, commits, issues, languages } = data;
  const q = question.toLowerCase().trim();
  const lines: string[] = [];

  const repoLabel = info?.full_name ?? "this repository";
  const isFollowUp = q.split(/\s+/).length <= 5 &&
    !/^(give|show|what'?s|what is|tell|describe|overview|about|analyze|how\s*(many|much|healthy|active|good|bad|old|big|large|small))/i.test(q) &&
    !/overview|intro|summary|background/i.test(q);

  // ── Intent detection ────────────────────────────────────
  // (specific intents first, overview depends on them)
  const wantsIssues = /issue|bug|problem|ticket|feature request|pr|pull request|open|tracker/i.test(q);
  const wantsCommits = /commit|changes|recent|activity|what changed|diff|pushed/i.test(q);
  const wantsCi = /ci|build|test|pipeline|workflow|deploy|action|pass|fail/i.test(q);
  const wantsContributors = /who|contributor|author|people|team|developer|wrote|made/i.test(q);
  const wantsHealth = /health|status|quality|maintain|stable|condition|state/i.test(q);
  const wantsStats = /star|fork|popular|size|language|trend|grow/i.test(q);
  const wantsFiles = /file|code|structure|architecture|src\/|folder|directory|tree/i.test(q);
  const wantsLanguage = /language|\.\w{1,4}\b|programming|python|javascript|typescript|rust|go|java|\.py|\.js|\.ts|\.rs|\.go/i.test(q);
  const wantsAnalysis = /think|opinion|impression|looks|review|deep|analyze|insight|verdict/i.test(q);
  const wantsSpecific = wantsIssues || wantsCommits || wantsCi || wantsContributors || wantsHealth || wantsStats || wantsFiles || wantsLanguage || wantsAnalysis;
  const wantsOverview = !wantsSpecific && (
    /^(give|tell|describe|analyze)\s+(me\s+)?(an?\s+)?overview\b/i.test(q) ||
    /^(what'?s|what is)\s+(this\s+)?(repo|repository|project)\s+(about|overview|summary)\b/i.test(q) ||
    /overview|intro|summary|background|about this repo/i.test(q) ||
    !isFollowUp
  );

  // ── Repo header (skip for follow-ups) ──────────────────
  if (!isFollowUp && info) {
    const starEmoji = info.stargazers_count > 1000 ? "🌟" : info.stargazers_count > 100 ? "⭐" : "✦";
    const forkEmoji = info.forks_count > 100 ? "🔱" : "⑂";
    const langList = Object.keys(languages);
    const topLang = langList.length > 0 ? langList.reduce((a, b) => languages[a] > languages[b] ? a : b) : info.language || "N/A";
    lines.push(`**${info.full_name}**`);
    if (info.description) lines.push(`> ${info.description}`);
    lines.push(
      `${starEmoji} **${info.stargazers_count.toLocaleString()}** stars · ${forkEmoji} **${info.forks_count.toLocaleString()}** forks · 🛠 **${topLang}** · 📋 ${info.open_issues_count} open issues`
    );
    if (langList.length > 1) {
      lines.push(`📦 Languages: ${langList.slice(0, 5).join(", ")}${langList.length > 5 ? ` +${langList.length - 5} more` : ""}`);
    }
    lines.push("");
  }

  // ── CI questions: explain limitation ────────────────────
  if (wantsCi) {
    lines.push(`🔧 **CI / Build System**`);
    lines.push(`CI pipeline data isn't available through the public GitHub API. To see Actions, workflows, and build status, visit the repo's Actions tab:`);
    lines.push(`> https://github.com/${info?.full_name ?? "owner/repo"}/actions`);
    lines.push(``);
    if (commits.length > 0) {
      const fixCount = commits.filter(c =>
        c.commit.message.toLowerCase().includes("fix") ||
        c.commit.message.toLowerCase().includes("test") ||
        c.commit.message.toLowerCase().includes("ci") ||
        c.commit.message.toLowerCase().includes("build")
      ).length;
      if (fixCount > 0) {
        lines.push(`Based on commit messages, **${fixCount}** of the last ${commits.length} commits mention fixes, tests, or build — suggests an active maintenance cycle.`);
      }
    }
    lines.push(``);
    lines.push(`_Want CI data? You'd need to import repository data using the button above._`);
    return lines.join("\n");
  }

  // ── File / language questions ──────────────────────────
  if (wantsFiles || wantsLanguage) {
    const langList = Object.keys(languages);
    const totalBytes = Object.values(languages).reduce((s, v) => s + v, 0);

    if (langList.length > 0) {
      // Check for specific language/extension
      const extMatch = q.match(/\.(\w{1,4})\b/);
      if (extMatch) {
        const ext = extMatch[1];
        const langMap: Record<string, string> = {
          py: "Python", js: "JavaScript", ts: "TypeScript", rs: "Rust",
          go: "Go", java: "Java", rb: "Ruby", php: "PHP", cs: "C#",
          cpp: "C++", c: "C", swift: "Swift", kt: "Kotlin", scala: "Scala",
          vue: "Vue", svelte: "Svelte", sol: "Solidity", sh: "Shell",
          yml: "YAML", yaml: "YAML", json: "JSON", md: "Markdown",
          html: "HTML", css: "CSS", scss: "SCSS", tsx: "TypeScript (JSX)",
          jsx: "JavaScript (JSX)",
        };
        const langName = langMap[ext] || ext.toUpperCase();
        const langBytes = languages[langName];

        if (langBytes !== undefined) {
          const pct = totalBytes > 0 ? (langBytes / totalBytes * 100).toFixed(1) : "0";
          lines.push(`📄 **${langName}** — yes! **${(langBytes / 1024).toFixed(1)} KB** (${pct}% of the codebase)`);
        } else {
          lines.push(`No **.${ext}** files detected in the repository.`);
          if (langList.length > 0) {
            lines.push(`The repo uses: **${langList.join("**, **")}**.`);
          }
        }
      } else if (langList.length === 1) {
        const pct = totalBytes > 0 ? "100" : "0";
        lines.push(`📄 This repo is written entirely in **${langList[0]}** (${pct}%).`);
      } else {
        const barWidth = 15;
        lines.push(`📦 **Languages** (${langList.length} total):`);
        for (const lang of langList) {
          const pct = totalBytes > 0 ? (languages[lang] / totalBytes * 100).toFixed(1) : "0";
          const filled = Math.max(1, Math.round((languages[lang] / totalBytes) * barWidth));
          const empty = barWidth - filled;
          lines.push(`${"█".repeat(filled)}${"░".repeat(empty)} **${lang}**: ${pct}%`);
        }
      }
    } else {
      lines.push(`Language data not available from the public API for this repository.`);
    }

    lines.push(``);
    lines.push(`_Want to explore files in detail? Try importing the repository data above._`);
    return lines.join("\n");
  }

  // ── Commits section ────────────────────────────────────
  if (wantsOverview || wantsCommits || wantsContributors || wantsAnalysis || wantsHealth) {
    if (commits.length > 0) {
      const authors = [...new Set(commits.map(c => c.commit.author.name))];
      const totalAdditions = commits.reduce((s, c) => s + (c.files?.reduce((a, f) => a + f.additions, 0) ?? 0), 0);
      const totalDeletions = commits.reduce((s, c) => s + (c.files?.reduce((a, f) => a + f.deletions, 0) ?? 0), 0);
      const recentMsg = commits[0]?.commit.message.split("\n")[0] ?? "N/A";
      const oldestDate = new Date(commits[commits.length - 1].commit.author.date);
      const newestDate = new Date(commits[0].commit.author.date);
      const dateRange = `${oldestDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${newestDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

      if (wantsContributors) {
        const authorCounts = new Map<string, number>();
        for (const c of commits) {
          authorCounts.set(c.commit.author.name, (authorCounts.get(c.commit.author.name) || 0) + 1);
        }
        const sorted = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);
        lines.push(`👥 **Contributors** (${sorted.length} total in recent commits):`);
        for (const [name, count] of sorted) {
          const pct = Math.round((count / commits.length) * 100);
          const cBarWidth = 10;
          const filled = Math.max(1, Math.round((count / commits.length) * cBarWidth));
          const empty = cBarWidth - filled;
          lines.push(`${"█".repeat(filled)}${"░".repeat(empty)} **${name}**: ${count} commits (${pct}%)`);
        }
      } else {
        const changeRatio = totalDeletions > 0 ? (totalAdditions / totalDeletions).toFixed(1) : "∞";
        const activityIntensity = commits.length > 5 ? "high" : commits.length > 2 ? "moderate" : "low";

        lines.push(`📊 **Recent Activity** (${commits.length} commits, ${dateRange})`);
        lines.push(`**${authors.length}** contributor${authors.length !== 1 ? "s" : ""} · +**${totalAdditions.toLocaleString()}** / -**${totalDeletions.toLocaleString()}** lines (ratio ${changeRatio}) · Activity: **${activityIntensity}**`);

        if (totalAdditions > totalDeletions * 2) {
          lines.push(`📈 *Net-positive — active feature development.*`);
        } else if (totalDeletions > totalAdditions * 1.5) {
          lines.push(`📉 *Net-negative — refactoring or cleanup phase.*`);
        } else {
          lines.push(`⚖️ *Balanced — maintenance alongside new work.*`);
        }

        lines.push(``);
        lines.push(`🔄 **Latest:** \`${commits[0].sha.slice(0, 7)}\` — ${recentMsg} — **${commits[0].commit.author.name}**`);

        const recentSlice = commits.slice(1, 4);
        if (recentSlice.length > 0) {
          lines.push(``);
          for (const c of recentSlice) {
            const date = new Date(c.commit.author.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const shortMsg = c.commit.message.split("\n")[0];
            lines.push(`- \`${c.sha.slice(0, 7)}\` (${date}) — ${shortMsg} — **${c.commit.author.name}**`);
          }
        }
      }
    }
    if (wantsCommits && commits.length === 0) {
      lines.push(`📊 **Recent Activity**: No recent commits found for this repository.`);
    }
  }

  // ── Issues section ─────────────────────────────────────
  if (wantsOverview || wantsIssues || wantsHealth || wantsAnalysis) {
    if (issues.length > 0) {
      const open = issues.filter(i => i.state === "open" && !i.pull_request);
      const prs = issues.filter(i => i.pull_request);
      const closed = issues.filter(i => i.state === "closed");
      const bugIssues = open.filter(i => i.labels.some(l => l.name.toLowerCase().includes("bug") || l.name.toLowerCase().includes("fix")));
      const enhancementIssues = open.filter(i => i.labels.some(l => l.name.toLowerCase().includes("enhancement") || l.name.toLowerCase().includes("feature")));

      if (open.length > 0 || prs.length > 0) {
        lines.push(``);
        lines.push(`🎯 **Issue Tracker** (${issues.length} total)`);
        lines.push(`**${open.length}** open · **${closed.length}** closed · **${prs.length}** pull requests`);
        if (bugIssues.length > 0) lines.push(`🐛 **${bugIssues.length}** bug${bugIssues.length !== 1 ? "s" : ""} reported`);
        if (enhancementIssues.length > 0) lines.push(`💡 **${enhancementIssues.length}** feature request${enhancementIssues.length !== 1 ? "s" : ""}`);

        const responseRatio = closed.length > 0 ? (closed.length / issues.length * 100).toFixed(0) : "0";
        const healthStatus = closed.length > open.length ? "healthy — more resolved than open 💚" :
          open.length > closed.length * 2 ? "needs attention — issues outpacing closures ❤️" :
          "balanced — issues being addressed at a steady pace 💛";
        lines.push(`📋 **Resolution rate**: ${responseRatio}% resolved · ${healthStatus}`);

        if (open.length > 0) {
          lines.push(``);
          lines.push(`**Key open items:**`);
          for (const issue of open.slice(0, 5)) {
            const labels = issue.labels.map(l => l.name).join(", ");
            lines.push(`- #${issue.number} — ${issue.title}${labels ? ` [${labels}]` : ""}`);
          }
        }
      } else {
        lines.push(``);
        lines.push(`🎯 **Issue Tracker**: All ${issues.length} items resolved. Clean tracker! ✨`);
      }
    } else {
      lines.push(``);
      const cleanMsg = info ? `**${info.full_name}** has no issues or PRs in recent data.` : `No issues or PRs found.`;
      if (wantsIssues) lines.push(`🎯 ${cleanMsg}`);
    }
  }

  // ── Stats section ────────────────────────────────────
  if (wantsStats && info) {
    const starPercentile = info.stargazers_count > 10000 ? "very popular" :
      info.stargazers_count > 1000 ? "moderately popular" :
      info.stargazers_count > 100 ? "gaining traction" : "niche";
    const langInfo = info.language ? `built primarily in **${info.language}**` : "language not specified";
    lines.push(``);
    lines.push(`📈 **Stats**: ${info.stargazers_count.toLocaleString()} stars (${starPercentile}) · ${info.forks_count.toLocaleString()} forks · ${langInfo}`);
    if (info.stargazers_count > 0 && info.forks_count > 0) {
      const ratio = (info.stargazers_count / info.forks_count).toFixed(1);
      if (parseFloat(ratio) > 10) lines.push(`💡 *High star-to-fork ratio (${ratio}x) — widely watched but less forked.*`);
      else if (parseFloat(ratio) > 3) lines.push(`💡 *Strong engagement — ${ratio} stars per fork.*`);
    }
  }

  // ── Health / verdict (only for overviews or health asks) ──
  if (wantsOverview || wantsAnalysis || wantsHealth) {
    const healthSignals: string[] = [];
    if (commits.length > 3) healthSignals.push("active development");
    if (info && info.open_issues_count < 10) healthSignals.push("well-maintained tracker");
    if (commits.some(c => c.commit.message.toLowerCase().includes("fix") || c.commit.message.toLowerCase().includes("bug"))) healthSignals.push("responsive to bugs");
    if (info && info.stargazers_count > 100) healthSignals.push("growing community interest");
    if (info && info.forks_count > 20) healthSignals.push("active fork ecosystem");

    lines.push(``);
    if (healthSignals.length > 0) {
      lines.push(`🔍 **Verdict**: ${repoLabel} shows ${healthSignals.join(", ")}.`);
    } else if (info) {
      lines.push(`🔍 **Verdict**: ${repoLabel} appears to be an early-stage or low-traffic project.`);
    }
  }

  // ── Footer ────────────────────────────────────────────
  lines.push(``);
  if (isFollowUp) {
    const followUps = [
      `_Want to dig deeper? Try "who's contributing?", "show me bugs", or "what languages?"_`,
      `_Anything else? Ask about contributors, file types, or overall health._`,
      `_Follow-up with "compare periods", "top authors", or "does it have .py?"_`,
    ];
    lines.push(followUps[Math.floor(Math.random() * followUps.length)]);
  } else {
    const outros = [
      `_Data fetched live from GitHub. Ask a follow-up to dig deeper._`,
      `_Live from GitHub. Try "who's contributing most?" or "does it have .py?"_`,
      `_That's the picture from GitHub. Ask about issues, contributors, or files next._`,
    ];
    lines.push(outros[Math.floor(Math.random() * outros.length)]);
  }

  return lines.join("\n");
}

/* ── Smart fallback (no API key needed) ─────────────── */

function buildFallbackAnswer(
  result: QueryResult,
  question: string,
  repoId?: string,
  repoName?: string
): Answer {
  const q = question.toLowerCase();
  const synthesis = generateSmartAnswer(q, result, repoId, repoName);
  return {
    synthesis,
    evidence: {
      git: result.commits,
      issues: result.issues,
      ci: result.ci_runs,
    },
    impact: result.impact,
    context_used: result.context_used,
  };
}

function generateSmartAnswer(
  question: string,
  result: QueryResult,
  repoId?: string,
  repoName?: string
): string {
  const { commits, issues, ci_runs } = result;

  // Detect GitHub URL in the question itself
  const urlRepo = detectRepoUrlInQuestion(question);
  const effectiveRepoName = repoName || (urlRepo ? `${urlRepo.owner}/${urlRepo.repo}` : undefined);

  // Detect question intent
  const isWho = /^(who|whose|author|contributor|committer)/i.test(question);
  const isCount = /(how many|count|total|number of|summarize|summary)/i.test(question);
  const isBug = /(bug|fix|issue|error|broken|crash|fail)/i.test(question);
  const isCi = /(ci|build|test|pipeline|workflow|deploy)/i.test(question);
  const isFeature = /(plugin|feature|feat|add|new|implement|introduce)/i.test(question);
  const isWhen = /(when|date|timeline|history|created|first|last|year|month|202\d)/i.test(question);
  const isCommit = /(commit|change|diff|modify|file|code|what changed)/i.test(question);
  const isCompare = /(compare|vs|versus|difference|better|worse)/i.test(question);
  const isHealth = /(health|status|state|condition)/i.test(question);
  const isOpinion = /(think|opinion|impression|tell me about|overview|about this|review|looks)/i.test(question);

  // Route to specific answerers
  if (isCompare && commits.length > 0) return answerCompareQuestion(question, commits, effectiveRepoName);
  if (isWho) return answerWhoQuestion(question, commits, effectiveRepoName);
  if (isCount) return answerCountQuestion(question, commits, issues, ci_runs, effectiveRepoName);
  if (isBug) return answerBugQuestion(question, issues, commits, effectiveRepoName);
  if (isCi) return answerCiQuestion(ci_runs, effectiveRepoName);
  if (isFeature) return answerFeatureQuestion(question, commits, issues, effectiveRepoName);
  if (isWhen) return answerWhenQuestion(question, commits, effectiveRepoName);
  if (isCommit) return answerCommitQuestion(commits, effectiveRepoName);
  if (isHealth) return answerHealthQuestion(commits, issues, ci_runs, effectiveRepoName);
  if (isOpinion) return answerOverviewQuestion(commits, issues, ci_runs, effectiveRepoName);

  // Generic — mix it up so it doesn't feel repetitive
  return answerGeneric(commits, issues, ci_runs, effectiveRepoName);
}

/* ── Template helpers with variety ──────────────────── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function answerWhoQuestion(_question: string, commits: Commit[], repoName?: string): string {
  if (commits.length === 0) return "No commits found in the current data.";
  const authorCounts = new Map<string, number>();
  for (const c of commits) {
    authorCounts.set(c.author_name, (authorCounts.get(c.author_name) || 0) + 1);
  }
  const sorted = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);
  const mostActive = sorted[0];
  const lines: string[] = [];

  const repoRef = repoName ? ` in **${repoName}**` : "";
  const intros = [
    `**${mostActive[0]}** is the most active contributor${repoRef} with **${mostActive[1]} commits**.`,
    `The most prolific contributor${repoRef} is **${mostActive[0]}** (${mostActive[1]} commits).`,
    `**${mostActive[0]}** has the highest commit count${repoRef} — **${mostActive[1]}** in total.`,
  ];
  lines.push(pick(intros));

  if (sorted.length > 1) {
    lines.push(``);
    lines.push(`Full breakdown:`);
    for (const [author, count] of sorted) {
      const pct = Math.round((count / commits.length) * 100);
      lines.push(`- **${author}**: ${count} commits (${pct}%)`);
    }
  }
  return lines.join("\n");
}

function answerCountQuestion(_question: string, commits: Commit[], issues: Issue[], ci_runs: CiRun[], repoName?: string): string {
  const parts: string[] = [];
  const repoRef = repoName ? ` for **${repoName}**` : "";

  if (commits.length > 0) {
    const totalAdd = commits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.additions, 0), 0);
    const totalDel = commits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.deletions, 0), 0);
    parts.push(`**${commits.length} commits** (+${totalAdd.toLocaleString()}/-${totalDel.toLocaleString()} lines)`);
  }
  if (issues.length > 0) {
    const open = issues.filter((i) => i.state === "open").length;
    const closed = issues.filter((i) => i.state === "closed" || i.state === "merged").length;
    parts.push(`**${issues.length} issues/PRs** (${open} open, ${closed} resolved)`);
  }
  if (ci_runs.length > 0) {
    const success = ci_runs.filter((r) => r.conclusion === "success").length;
    const failed = ci_runs.filter((r) => r.conclusion === "failure").length;
    const rate = ci_runs.length > 0 ? Math.round((success / ci_runs.length) * 100) : 0;
    parts.push(`**${ci_runs.length} CI runs** (${rate}% pass rate)`);
  }

  if (parts.length === 0) return "No data found to summarize.";
  return `Here's a quick snapshot${repoRef}:\n\n${parts.join(" · ")}`;
}

function answerBugQuestion(_question: string, issues: Issue[], commits: Commit[], repoName?: string): string {
  const repoRef = repoName ? ` in **${repoName}**` : "";
  const bugIssues = issues.filter((i) =>
    i.labels.includes("bug") ||
    i.title.toLowerCase().includes("bug") ||
    i.title.toLowerCase().includes("fix") ||
    i.title.toLowerCase().includes("error")
  );
  if (bugIssues.length === 0) {
    const clean = repoName ? `**${repoName}** tracker` : "the tracker";
    return `No bugs found in ${clean}. Things look clean! ✨`;
  }
  const lines: string[] = [];
  lines.push(`Found **${bugIssues.length}** bug-related item${bugIssues.length !== 1 ? "s" : ""}:`);
  for (const issue of bugIssues) {
    const status = issue.state === "merged" ? "✅ fixed" : issue.state === "closed" ? "✅ closed" : "🔴 open";
    lines.push(`- #${issue.github_id} "${issue.title}" [${status}]`);
  }
  const fixCommits = commits.filter((c) =>
    c.message.toLowerCase().includes("fix") || c.message.toLowerCase().includes("bug")
  );
  if (fixCommits.length > 0) {
    lines.push("");
    lines.push(`Related fix commits:`);
    for (const c of fixCommits.slice(0, 3)) {
      lines.push(`- \`${c.hash.slice(0, 7)}\` — ${c.message}`);
    }
  }
  return lines.join("\n");
}

function answerCiQuestion(ci_runs: CiRun[], repoName?: string): string {
  if (ci_runs.length === 0) return "No CI runs in the data.";
  const success = ci_runs.filter((r) => r.conclusion === "success").length;
  const failed = ci_runs.filter((r) => r.conclusion === "failure").length;
  const inProgress = ci_runs.filter((r) => r.status === "in_progress" || r.status === "queued").length;
  const workflows = [...new Set(ci_runs.map((r) => r.workflow_name))];
  const passRate = ci_runs.length > 0 ? Math.round((success / ci_runs.length) * 100) : 0;

  const repoRef = repoName ? ` for **${repoName}**` : "";
  const verdict = passRate >= 90 ? "looking healthy 💚" : passRate >= 70 ? "decent 💛" : "needs attention ❤️";
  const lines: string[] = [
    `CI pipeline${repoRef} is **${verdict}** across **${workflows.length}** workflow${workflows.length !== 1 ? "s" : ""}:`,
    `- **${ci_runs.length}** total runs · **${passRate}%** pass rate · ${success} ✅ / ${failed} ❌${inProgress > 0 ? ` · ${inProgress} ⏳` : ""}`,
    `- Workflows: ${workflows.join(", ")}`,
  ];
  if (failed > 0) {
    const recent = ci_runs.filter((r) => r.conclusion === "failure").slice(0, 2);
    lines.push("");
    lines.push(`Recent failures:`);
    for (const r of recent) {
      const logPreview = r.logs.length > 120 ? r.logs.slice(0, 120) + "..." : r.logs;
      lines.push(`- Run #${r.run_id} (${r.branch}): ${logPreview}`);
    }
  }
  return lines.join("\n");
}

function answerFeatureQuestion(_question: string, commits: Commit[], issues: Issue[], repoName?: string): string {
  const repoRef = repoName ? ` in **${repoName}**` : "";
  const featCommits = commits.filter((c) =>
    /feat|add|plugin|new|implement|introduce/i.test(c.message)
  );
  if (featCommits.length > 0) {
    const lines: string[] = [`Found **${featCommits.length}** feature-related commit${featCommits.length !== 1 ? "s" : ""}:`];
    for (const c of featCommits.slice(0, 5)) {
      lines.push(`- \`${c.hash.slice(0, 7)}\` — ${c.message} (${c.author_name})`);
    }
    return lines.join("\n");
  }
  const featIssues = issues.filter((i) =>
    i.labels.includes("enhancement") ||
    /feat|feature|request/i.test(i.title)
  );
  if (featIssues.length > 0) {
    const lines: string[] = [`Found **${featIssues.length}** feature request${featIssues.length !== 1 ? "s" : ""}:`];
    for (const i of featIssues.slice(0, 5)) {
      lines.push(`- #${i.github_id} "${i.title}" [${i.state}]`);
    }
    return lines.join("\n");
  }
  return "No features or additions found matching your question.";
}

function answerWhenQuestion(question: string, commits: Commit[], repoName?: string): string {
  if (commits.length === 0) return "No commits to timeline.";
  const sorted = [...commits].sort((a, b) => new Date(a.committed_at).getTime() - new Date(b.committed_at).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const repoRef = repoName ? `**${repoName}** ` : "The project ";
  const lines: string[] = [
    `${repoRef}spans from **${fmt(first.committed_at)}** to **${fmt(last.committed_at)}** — **${sorted.length} commits** total.`,
    ``,
    `- 🏁 First: \`${first.hash.slice(0, 7)}\` — "${first.message}" by ${first.author_name}`,
    `- 🆕 Latest: \`${last.hash.slice(0, 7)}\` — "${last.message}" by ${last.author_name}`,
  ];
  const yearMatch = question.match(/20\d{2}/);
  if (yearMatch) {
    const year = yearMatch[0];
    const yearCommits = commits.filter((c) => c.committed_at.startsWith(year));
    if (yearCommits.length > 0) {
      lines.push(``);
      lines.push(`In **${year}** there were **${yearCommits.length}** commits:`);
      for (const c of yearCommits) {
        const d = new Date(c.committed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        lines.push(`- ${d} — \`${c.hash.slice(0, 7)}\` — ${c.message} (${c.author_name})`);
      }
    }
  }
  return lines.join("\n");
}

function answerCommitQuestion(commits: Commit[], repoName?: string): string {
  if (commits.length === 0) return "No commits found.";
  const sorted = [...commits].sort((a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime());
  const repoRef = repoName ? ` from **${repoName}**` : "";
  const lines: string[] = [`Here are the most relevant commits${repoRef} (**${commits.length}** matched):`];
  for (const c of sorted.slice(0, 5)) {
    const date = new Date(c.committed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const files = c.files_changed.map((f) => f.path).join(", ");
    const add = c.files_changed.reduce((s, f) => s + f.additions, 0);
    const del = c.files_changed.reduce((s, f) => s + f.deletions, 0);
    lines.push(`- \`${c.hash.slice(0, 7)}\` (${date}) by **${c.author_name}**`);
    lines.push(`  ${c.message}`);
    lines.push(`  _${files}_ · +${add}/-${del} lines`);
  }
  return lines.join("\n");
}

function answerCompareQuestion(_question: string, commits: Commit[], repoName?: string): string {
  if (commits.length < 2) return "Not enough data to compare periods.";
  const mid = Math.floor(commits.length / 2);
  const early = commits.slice(0, mid);
  const late = commits.slice(mid);
  const earlyAdd = early.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.additions, 0), 0);
  const lateAdd = late.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.additions, 0), 0);
  const earlyDel = early.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.deletions, 0), 0);
  const lateDel = late.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.deletions, 0), 0);
  const pace = early.length > 0 && late.length > 0
    ? (late.length / early.length).toFixed(1)
    : "N/A";
  const repoRef = repoName ? `**${repoName}** — ` : "";
  return `${repoRef}Comparing first **${early.length}** vs last **${late.length}** commits:\n\n- Early: +${earlyAdd.toLocaleString()}/-${earlyDel.toLocaleString()} lines\n- Recent: +${lateAdd.toLocaleString()}/-${lateDel.toLocaleString()} lines\n- Commit pace: ${pace}x (recent vs early period)`;
}

function answerHealthQuestion(commits: Commit[], issues: Issue[], ci_runs: CiRun[], repoName?: string): string {
  const repoRef = repoName ? ` for **${repoName}**` : "";
  const lines: string[] = [`Here's the project health overview${repoRef}:`];
  if (commits.length > 0) {
    const recent = commits.filter((c) => new Date(c.committed_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
    lines.push(`- **Activity**: ${commits.length} total commits (${recent} in the last 30 days)`);
  }
  if (issues.length > 0) {
    const open = issues.filter((i) => i.state === "open").length;
    const total = issues.length;
    lines.push(`- **Issues**: ${total} total (${open} open — ${Math.round((open / total) * 100)}% open rate)`);
  }
  if (ci_runs.length > 0) {
    const success = ci_runs.filter((r) => r.conclusion === "success").length;
    const rate = Math.round((success / ci_runs.length) * 100);
    lines.push(`- **CI**: ${rate}% pass rate (${success}/${ci_runs.length} runs)`);
  }
  return lines.join("\n");
}

function answerOverviewQuestion(commits: Commit[], issues: Issue[], ci_runs: CiRun[], repoName?: string): string {
  if (commits.length === 0 && issues.length === 0 && ci_runs.length === 0) {
    return "No repository data has been loaded yet. Import your data using the button above, then I can give you a full overview!";
  }

  const lines: string[] = [];
  const authors = [...new Set(commits.map((c) => c.author_name))];
  const firstDate = commits.length > 0
    ? new Date(commits[commits.length - 1].committed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const lastDate = commits.length > 0
    ? new Date(commits[0].committed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const repoLabel = repoName ? `**${repoName}**` : "this repository";
  const intros = [
    `Here's my take on ${repoLabel}:\n`,
    `Looking at the data for ${repoLabel}, here's what stands out:\n`,
    `Great question! Here's the overview of what's happening in ${repoLabel}:\n`,
  ];
  lines.push(pick(intros));

  if (commits.length > 0) {
    // Trend insight
    const recent = commits.filter((c) => new Date(c.committed_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)).length;
    const totalAdd = commits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.additions, 0), 0);
    const totalDel = commits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.deletions, 0), 0);
    const topAuthor = authors.reduce((best, a) => {
      const count = commits.filter((c) => c.author_name === a).length;
      return count > (best.count || 0) ? { name: a, count } : best;
    }, { name: "", count: 0 });

    lines.push(`📊 **Commits & Activity**`);
    lines.push(`This repo has **${commits.length} commits** by **${authors.length}** contributor${authors.length !== 1 ? "s" : ""} spanning ${firstDate} → ${lastDate}.`);
    lines.push(`**${topAuthor.name}** is the most active with **${topAuthor.count} commits**.`);
    lines.push(`In the last 3 months there have been **${recent} commits**. Overall, **+${totalAdd.toLocaleString()}/-${totalDel.toLocaleString()}** lines changed.`);

    // Recent work
    const recentCommits = commits.slice(0, 3);
    lines.push(`\n🔄 **Recent work:**`);
    for (const c of recentCommits) {
      lines.push(`- \`${c.hash.slice(0, 7)}\` — ${c.message}`);
    }
  }

  if (issues.length > 0) {
    lines.push(``);
    const open = issues.filter((i) => i.state === "open").length;
    const closed = issues.filter((i) => i.state === "closed" || i.state === "merged").length;
    const prs = issues.filter((i) => i.type === "pull_request").length;
    const bugs = issues.filter((i) => i.labels.includes("bug")).length;
    lines.push(`🎯 **Issues & Pull Requests**`);
    lines.push(`**${issues.length}** total (${open} open, ${closed} resolved, ${prs} PRs)`);
    if (bugs > 0) lines.push(`**${bugs}** bug${bugs !== 1 ? "s" : ""} tracked.`);
    if (open > 3) lines.push(`There are ${open} open items — might be worth triaging.`);
    else if (open === 0 && issues.length > 0) lines.push(`All issues resolved — clean tracker! ✨`);
  }

  if (ci_runs.length > 0) {
    lines.push(``);
    const success = ci_runs.filter((r) => r.conclusion === "success").length;
    const failed = ci_runs.filter((r) => r.conclusion === "failure").length;
    const rate = Math.round((success / ci_runs.length) * 100);
    const verdict = rate >= 90 ? "healthy 💚" : rate >= 70 ? "decent 💛" : "needs attention ❤️";
    lines.push(`🔧 **CI Health**`);
    lines.push(`**${ci_runs.length}** runs · **${rate}%** pass rate — ${verdict}`);
    if (failed > 0) lines.push(`${failed} failure${failed !== 1 ? "s" : ""} to investigate.`);
  }

  lines.push(``);
  const outros = [
    `Want to dig deeper? Try asking about specific commits, issues, or authors.`,
    `That's the bird's-eye view. Ask me anything specific and I'll go deeper!`,
    `Hope that gives you a clear picture. What would you like to explore next?`,
  ];
  lines.push(pick(outros));

  return lines.join("\n");
}

function answerGeneric(commits: Commit[], issues: Issue[], ci_runs: CiRun[], repoName?: string): string {
  if (commits.length === 0 && issues.length === 0 && ci_runs.length === 0) {
    return "No repository data has been loaded yet. Import your data using the button above, then ask me anything!";
  }

  const lines: string[] = [];

  const repoRef = repoName ? ` in **${repoName}**` : "";
  const openers = [
    `Here's what I found${repoRef}:`,
    `Looking through the data${repoRef}, here's the picture:`,
    `Let me break down what's in this repository${repoRef}:`,
  ];
  lines.push(pick(openers));
  lines.push("");

  if (commits.length > 0) {
    const authors = [...new Set(commits.map((c) => c.author_name))];
    const firstDate = new Date(commits[commits.length - 1].committed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const lastDate = new Date(commits[0].committed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    lines.push(`**${commits.length} commits** by **${authors.length}** contributors (${firstDate} → ${lastDate}).`);
    const topThree = commits.slice(0, 3);
    lines.push(`Recent: ${topThree.map((c) => '"' + c.message + '" (' + c.hash.slice(0, 7) + ')').join("; ")}.`);
  }

  if (issues.length > 0) {
    const open = issues.filter((i) => i.state === "open").length;
    const closed = issues.filter((i) => i.state === "closed" || i.state === "merged").length;
    const prs = issues.filter((i) => i.type === "pull_request").length;
    lines.push(`**${issues.length} items** in tracker (${open} open, ${closed} resolved, ${prs} PRs).`);
  }

  if (ci_runs.length > 0) {
    const success = ci_runs.filter((r) => r.conclusion === "success").length;
    const failed = ci_runs.filter((r) => r.conclusion === "failure").length;
    const passRate = ci_runs.length > 0 ? Math.round((success / ci_runs.length) * 100) : 0;
    lines.push(`**CI**: ${ci_runs.length} runs · ${passRate}% pass (${success} ✅ / ${failed} ❌).`);
  }

  return lines.join("\n");
}

/* ── Main answer function ───────────────────────────── */

export async function generateAnswer(
  repoId: string | null,
  repoName: string | null,
  question: string,
  signal?: AbortSignal
): Promise<Answer> {
  // 0. Handle greetings
  if (isGreeting(question)) {
    return {
      synthesis: buildGreetingResponse(question),
      evidence: { git: [], issues: [], ci: [] },
      impact: [],
      context_used: { commits: [], issues: [], ci_runs: [], files: [] },
    };
  }

  // 1. Query local data (only if a repo is actually loaded)
  let result: QueryResult = {
    commits: [],
    issues: [],
    ci_runs: [],
    impact: [],
    context_used: { commits: [], issues: [], ci_runs: [], files: [] },
  };
  if (repoId) {
    result = queryRepo(repoId, question);
  }
  const hasLocalData = result.commits.length > 0 || result.issues.length > 0 || result.ci_runs.length > 0;

  // 2. Detect GitHub repo reference in the question
  const urlRepo = detectRepoUrlInQuestion(question);

  // 3. Fetch live GitHub data if no local data & a repo is mentioned
  let ghData: { info: GitHubRepoInfo | null; commits: GitHubCommit[]; issues: GitHubIssue[]; languages: Record<string, number> } | null = null;
  if (!hasLocalData && urlRepo) {
    ghData = await fetchGitHubData(urlRepo.owner, urlRepo.repo);
  }

  // 4. GitHub data found — use intelligence pipeline
  if (ghData && (ghData.info || ghData.commits.length > 0 || ghData.issues.length > 0)) {
    const effectiveRepoName = ghData.info?.full_name ?? `${urlRepo!.owner}/${urlRepo!.repo}`;

    // Try Gemini first with live GitHub context
    const apiKey = getApiKey();
    if (apiKey) {
      const ghContext = buildGitHubContextPrompt(ghData);
      const systemPrompt = buildSystemPrompt(effectiveRepoName);
      const userContent = `## Question\n${question}\n\n## Live GitHub Data\n${ghContext}`;
      try {
        const synthesis = await callGemini(systemPrompt, userContent, signal);
        return {
          synthesis,
          evidence: { git: [], issues: [], ci: [] },
          impact: [],
          context_used: { commits: [], issues: [], ci_runs: [], files: [] },
          liveData: buildLiveData(ghData, urlRepo!.owner, urlRepo!.repo),
        };
      } catch {
        // fall through to template
      }
    }

    // Template fallback for GitHub data
    const synthesis = buildGitHubAnswer(ghData, question);
    return {
      synthesis,
      evidence: { git: [], issues: [], ci: [] },
      impact: [],
      context_used: { commits: [], issues: [], ci_runs: [], files: [] },
      liveData: buildLiveData(ghData, urlRepo!.owner, urlRepo!.repo),
    };
  }

  // 5. No data at all — ask which repo
  if (!hasLocalData && !urlRepo && !repoId) {
    return {
      synthesis: `I'd love to help! But I need to know which repository you're asking about.

You can either:
- **Ask directly about a public repo**: just mention it like \`facebook/react\` or \`Krdusk/Gains-Grains\`
- **Upload your own data**: click the **Import Repository Data** button above
- **Reference a loaded repo**: if you've already imported, just ask away!

For example: _"Give me an overview of **Krdusk/Gains-Grains**"_`,
      evidence: { git: [], issues: [], ci: [] },
      impact: [],
      context_used: { commits: [], issues: [], ci_runs: [], files: [] },
    };
  }

  // 6. Repo exists but no data loaded — auto-fetch from GitHub using the selected repo name
  if (!hasLocalData && repoId) {
    // Determine which owner/repo to fetch: from question, or from the selected repo name
    let ghOwnerRepo = urlRepo;
    if (!ghOwnerRepo && repoName) {
      const parts = repoName.split("/");
      if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
        ghOwnerRepo = { owner: parts[0].trim(), repo: parts[1].trim() };
      }
    }
    if (ghOwnerRepo) {
      ghData = await fetchGitHubData(ghOwnerRepo.owner, ghOwnerRepo.repo);
      if (ghData && (ghData.info || ghData.commits.length > 0 || ghData.issues.length > 0)) {
        const effectiveRepoName = ghData.info?.full_name ?? `${ghOwnerRepo.owner}/${ghOwnerRepo.repo}`;
        const apiKey = getApiKey();
        if (apiKey) {
          const ghContext = buildGitHubContextPrompt(ghData);
          const systemPrompt = buildSystemPrompt(effectiveRepoName);
          const userContent = `## Question\n${question}\n\n## Live GitHub Data\n${ghContext}`;
          try {
            const synthesis = await callGemini(systemPrompt, userContent, signal);
            return { synthesis, evidence: { git: [], issues: [], ci: [] }, impact: [], context_used: { commits: [], issues: [], ci_runs: [], files: [] }, liveData: buildLiveData(ghData, ghOwnerRepo.owner, ghOwnerRepo.repo) };
          } catch {}
        }
        return { synthesis: buildGitHubAnswer(ghData, question), evidence: { git: [], issues: [], ci: [] }, impact: [], context_used: { commits: [], issues: [], ci_runs: [], files: [] }, liveData: buildLiveData(ghData, ghOwnerRepo.owner, ghOwnerRepo.repo) };
      }
    }
    return {
      synthesis: `The repository **${repoName ?? repoId}** has no data loaded yet. Import repository data using the button above, or ask about a specific public repo like \`owner/repo\`.`,
      evidence: { git: [], issues: [], ci: [] },
      impact: [],
      context_used: { commits: [], issues: [], ci_runs: [], files: [] },
    };
  }

  // 7. Try Gemini with local data
  const apiKey = getApiKey();
  if (apiKey && hasLocalData) {
    const contextPrompt = buildContextPrompt(result);
    const systemPrompt = buildSystemPrompt(repoName ?? "this repository");
    const userContent = `## Question\n${question}\n\n## Evidence Context\n${contextPrompt || "No specific evidence found for this query."}`;
    try {
      const synthesis = await callGemini(systemPrompt, userContent, signal);
      return {
        synthesis,
        evidence: { git: result.commits, issues: result.issues, ci: result.ci_runs },
        impact: result.impact,
        context_used: result.context_used,
      };
    } catch {
      // fall through to templates
    }
  }

  // 8. Fallback templates
  return buildFallbackAnswer(result, question, repoId ?? undefined, repoName ?? undefined);
}

/* ── Build context prompt from GitHub API data ────────── */

function buildGitHubContextPrompt(data: { info: GitHubRepoInfo | null; commits: GitHubCommit[]; issues: GitHubIssue[]; languages: Record<string, number> }): string {
  const sections: string[] = [];

  if (data.info) {
    sections.push(
      `## Repository Info\n- Name: ${data.info.full_name}\n- Description: ${data.info.description || "No description"}\n- Language: ${data.info.language || "N/A"}\n- Stars: ${data.info.stargazers_count}\n- Forks: ${data.info.forks_count}\n- Open Issues: ${data.info.open_issues_count}`
    );
  }

  if (data.commits.length > 0) {
    sections.push(
      `## Recent Commits (${data.commits.length}):\n` +
        data.commits.map((c) => {
          const msg = c.commit.message.split("\n")[0];
          return `- \`${c.sha.slice(0, 7)}\` by ${c.commit.author.name} on ${new Date(c.commit.author.date).toLocaleDateString()}: "${msg}"`;
        }).join("\n")
    );
  }

  if (data.issues.length > 0) {
    const open = data.issues.filter(i => i.state === "open" && !i.pull_request);
    const prs = data.issues.filter(i => i.pull_request);
    const closed = data.issues.filter(i => i.state === "closed");
    sections.push(
      `## Issues & PRs (${data.issues.length} total):\n- Open Issues: ${open.length}\n- PRs: ${prs.length}\n- Closed: ${closed.length}\n` +
        open.slice(0, 8).map(i => `- #${i.number} — "${i.title}"`).join("\n")
    );
  }

  return sections.join("\n\n");
}

/* ── Convert GitHub API data to app types for LiveRepoData ── */

function buildLiveData(
  ghData: { info: GitHubRepoInfo | null; commits: GitHubCommit[]; issues: GitHubIssue[]; languages: Record<string, number> },
  owner: string,
  repo: string
): LiveRepoData | undefined {
  if (!ghData.info && ghData.commits.length === 0 && ghData.issues.length === 0) return undefined;

  const repoName = ghData.info?.full_name ?? `${owner}/${repo}`;
  const [ownerName] = repoName.split("/");

  const appRepo: Repository = {
    id: `gh-${owner}-${repo}`,
    name: repo,
    owner: ownerName,
    description: ghData.info?.description ?? "",
    language: ghData.info?.language ?? "N/A",
    processed_at: new Date().toISOString(),
    stats: {
      commits_count: ghData.commits.length,
      issues_count: ghData.issues.length,
      prs_count: ghData.issues.filter((i) => i.pull_request).length,
      ci_runs_count: 0,
    },
  };

  const appCommits: Commit[] = ghData.commits.map((c) => ({
    hash: c.sha,
    author_name: c.commit.author.name,
    author_email: "",
    message: c.commit.message.split("\n")[0],
    files_changed: (c.files ?? []).map((f) => ({
      path: f.filename,
      additions: f.additions,
      deletions: f.deletions,
    })),
    committed_at: c.commit.author.date,
  }));

  const appIssues: Issue[] = ghData.issues.map((i) => ({
    github_id: i.number,
    type: i.pull_request ? "pull_request" : "issue",
    title: i.title,
    body: "",
    state: i.state,
    labels: i.labels.map((l) => l.name),
    created_at: i.created_at,
    closed_at: null,
  }));

  return { repo: appRepo, commits: appCommits, issues: appIssues };
}