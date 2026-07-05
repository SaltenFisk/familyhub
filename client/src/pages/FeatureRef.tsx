import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function FeatureRef() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-3 h-14">
          <Link
            to="/"
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-1">
            <span className="text-orange-500 font-bold text-lg tracking-tight">Family</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold text-lg tracking-tight">Hub</span>
          </div>
          <span className="text-slate-400 dark:text-slate-500 text-sm font-mono">/ Feature Reference</span>
        </div>
      </header>
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8 text-sm text-slate-700 dark:text-slate-300">

      {/* Purpose */}
      <section className="mb-12">
        <Eyebrow>Overview</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">What FamilyHub does</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-prose leading-relaxed">
          Emails sent to <Mono>family@saltenfisk.com</Mono> are automatically read, analysed by Claude, and surfaced as structured tasks on a shared family dashboard. No manual triage — the inbox becomes a to-do list.
        </p>
        <div className="overflow-x-auto">
          <div className="flex items-stretch gap-0 min-w-max">
            {[
              ['IMAP inbox', 'family@saltenfisk.com'],
              ['imapflow poll', 'every 2 min'],
              ['mailparser', 'parse + store'],
              ['Claude API', 'classify + extract'],
              ['Task created', 'DB + dashboard'],
            ].map(([title, sub], i, arr) => (
              <div key={i} className="flex items-center">
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3">
                  <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{title}</div>
                  <div className="font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>
                </div>
                {i < arr.length - 1 && <span className="text-slate-300 dark:text-slate-600 px-1 text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* People */}
      <section className="mb-12">
        <Eyebrow>People</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Family members</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-prose leading-relaxed">
          Claude categorises each email by who it's relevant to, based on who is explicitly named — not by guessing from the activity type. Multiple categories are normal.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { name: 'Darren',   role: 'Admin',  colour: 'text-green-600 dark:text-green-400' },
            { name: 'Lorraine', role: 'Admin',  colour: 'text-amber-600 dark:text-amber-400' },
            { name: 'Thomas',   role: 'Child',  colour: 'text-sky-600   dark:text-sky-400'   },
            { name: 'Matthew',  role: 'Child',  colour: 'text-purple-600 dark:text-purple-400' },
          ].map(m => (
            <div key={m.name} className="border border-slate-200 dark:border-slate-700 p-3">
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">{m.name}</div>
              <div className={`font-mono text-xs uppercase tracking-wide ${m.colour}`}>{m.role}</div>
            </div>
          ))}
        </div>
        <p className="text-slate-500 dark:text-slate-400 max-w-prose leading-relaxed">
          If addressed generically ("Dear Parent"), the system assigns to a parent. Children are only included when explicitly named.
        </p>
      </section>

      {/* Ingestion */}
      <section className="mb-12">
        <Eyebrow>Email pipeline</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Ingestion</h2>
        <FeatureList rows={[
          ['Poll interval', 'Every 2 minutes', 'Node-cron fires the mailbox poller continuously. An initial poll also runs on server startup.'],
          ['Search window', '14-day sliding', 'Fetches UIDs matching unseen OR received within the last 14 days. Covers backlogs up to two weeks.'],
          ['Deduplication', 'message-id', <>Each email's <Mono>Message-ID</Mono> header is stored; re-seen messages are skipped. No subject-based dedup (removed — caused false positives on Gmail forwards).</>],
          ['Failed retry', 'On next poll', <>Emails stored but not yet analysed (<Mono>processed = 0</Mono> with no task) are retried automatically on every subsequent poll.</>],
          ['Error visibility', 'Admin banner', 'Claude API quota/overload errors are written to the settings table and shown to admins as a dismissible banner. Clears automatically on next successful analysis.'],
        ]} />
      </section>

      {/* AI Analysis */}
      <section className="mb-12">
        <Eyebrow>Email pipeline</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">AI analysis</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-prose leading-relaxed">
          Claude Sonnet analyses each email and returns structured JSON. The system prompt is opinionated about classification — Claude defaults to FYI rather than over-generating action items.
        </p>
        <FeatureList rows={[
          ['Model', 'claude-sonnet-4-6', 'Max 1024 output tokens. JSON-only response enforced by the system prompt.'],
          ['Extracted fields', '', <><Mono>sender</Mono> · <Mono>summary</Mono> · <Mono>action</Mono> · <Mono>due_date</Mono> · <Mono>is_upcoming</Mono> · <Mono>event_date</Mono> · <Mono>is_fyi_only</Mono> · <Mono>categories</Mono> · <Mono>tags</Mono> · <Mono>assignee</Mono></>],
          ['Assignee logic', 'Layered fallback', "1. Claude's explicit suggestion (based on who the email addresses by name). 2. Default assignee set on a matched tag. 3. Null (unassigned)."],
          ['Tag creation', 'Auto + approval', 'New tags are created as unapproved. Admins can approve, rename, and set a default assignee per tag.'],
          ['Sender name', 'Stored on email', 'Claude extracts a human-readable sender name (e.g. "3rd Hitchin Scouts", "Thames Water") and stores it on the email record for display throughout the UI.'],
        ]} />
      </section>

      {/* Attachments */}
      <section className="mb-12">
        <Eyebrow>Email pipeline</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Attachment handling</h2>
        <FeatureList rows={[
          ['ICS / Calendar', 'text/calendar · .ics', <>Parsed with a custom ICS parser. Extracts event title, start/end dates, location, organiser, description. Handles Apple Calendar extensions, TZID variants, and line unfolding. Inline <Mono>BEGIN:VCALENDAR</Mono> in the email body is also detected. Calendar invites are always classified as upcoming.</>],
          ['PDF', 'application/pdf · .pdf', 'Passed to Claude as a native document block (up to 8 MB). Claude reads the PDF content directly.'],
          ['Word docs', '.docx · .doc', 'Text extracted via mammoth (first 6,000 chars) and appended to the analysis prompt as plain text.'],
          ['Storage', 'BLOB in DB', 'All qualifying attachments are stored in the database. Accessible from the email modal; clicking an attachment opens it in a new tab.'],
        ]} />
      </section>

      {/* Task types */}
      <section className="mb-12">
        <Eyebrow>Task system</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Task types</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4">Every task is exactly one of three types — the flags are mutually exclusive.</p>
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />Action required
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-400 text-xs font-semibold rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />Upcoming event
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs font-semibold rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />Info only
          </span>
        </div>
        <FeatureList rows={[
          ['Action required', 'is_fyi=0, is_upcoming=0', 'Something must be done: payment due, form to sign, consent needed, decision required. Has an action field and optional due date. Tracked with a status (Pending → In Progress → Done) and an optional outcome note.'],
          ['Upcoming', 'is_upcoming=1', "A confirmed future event the family needs to show up for. Has an event date. Disappears from the dashboard automatically once the event date passes (client-side filter; record stays in DB). Calendar invites always land here."],
          ['Info only', 'is_fyi=1', 'Newsletters, receipts, delivery notifications, statements. No action or event date. Shown in a separate panel; no status tracking.'],
        ]} />
      </section>

      {/* Lifecycle */}
      <section className="mb-12">
        <Eyebrow>Task system</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Task lifecycle</h2>
        <FeatureList rows={[
          ['Status', '3 states', <>Pending → In Progress → Done. Status is only relevant to action tasks. Children can update status on tasks assigned to them; admins can update any task.</>],
          ['Outcome', 'Free text', 'When a task is marked Done, a textarea appears to record what was done.'],
          ['Comments', 'Per-task thread', "Any user can add comments to any task. Comments show the author's initials, name, and timestamp. Adding a comment refreshes the dashboard without closing the modal."],
          ['Dismiss', 'Hard delete', "Admins can dismiss a task from the dashboard (hover to reveal the × button). This hard-deletes the task record; the underlying email is retained in the archive."],
          ['Re-classify', 'Admin editable', 'Admins can change a task\'s type (Action / Upcoming / Info), event date, due date, and assignee from within the email modal.'],
          ['Default assignee', 'Per tag', 'When saving an assignee change, admins can tick "Set as default for these tags" to automatically assign future emails with matching tags to the same person.'],
        ]} />
      </section>

      {/* Tags */}
      <section className="mb-12">
        <Eyebrow>Task system</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Tags &amp; categories</h2>
        <FeatureList rows={[
          ['Categories', "Who it's for", 'Darren · Lorraine · Thomas · Matthew. Multiple allowed. Shown as coloured chips; admins can toggle them in the modal. Used for the "Who" filter on the dashboard.'],
          ['Tags', "What it's about", 'Short descriptive labels ("scouts", "rugby", "gas bill"). Claude generates them automatically; new ones start unapproved. Admins approve, rename, and set default assignees.'],
          ['Filters', 'Dashboard chips', 'The dashboard has chip filters for Who (categories) and Assignee (including an "Unassigned" option). Filters apply across all three panels simultaneously.'],
        ]} />
      </section>

      {/* Dashboard */}
      <section className="mb-12">
        <Eyebrow>Interface</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Dashboard</h2>
        <FeatureList rows={[
          ['Actions panel', 'Sort: due date ↑', 'Pending/in-progress tasks. Tasks with a due date sort to the top (soonest first); undated tasks follow, sorted by received date descending.'],
          ['Upcoming panel', 'Sort: event date ↑', 'Events where event date ≥ today. Same sort logic: dated first, undated by received. Past events drop off automatically.'],
          ['Info panel', 'Sort: received ↓', 'FYI-only tasks, newest first.'],
          ['Task limit', '500 per load', 'API returns up to 500 tasks. All filtering and sorting happens client-side after this single fetch.'],
          ['API error banner', 'Admin only', 'Polls the status endpoint every 60 seconds. If Claude API has hit quota or overloaded, a dismissible modal appears with the error and a link to the Anthropic console.'],
          ['Demo mode', '/demo route', 'A fully self-contained demo at /familyhub/#/demo using 10 static mock emails. No authentication, no API calls. Uses a fictional family (Jill, Mark, Hope, Charles).'],
        ]} />
      </section>

      {/* Modal */}
      <section className="mb-12">
        <Eyebrow>Interface</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Email modal</h2>
        <FeatureList rows={[
          ['Header', '', 'Subject line, from address, who (category chips — editable for admins), tags.'],
          ['Summary panel', 'Collapsible', 'Collapsed by default. Toggle reveals AI summary, action text, due date picker, assignee dropdown with optional "set as default" checkbox. Also shows attachment list when open.'],
          ['Email body', 'Resizable', 'HTML emails rendered in a sandboxed iframe with injected light/dark CSS. Plain text fallback. Body height is draggable via a handle between the body and comments (minimum 80px).'],
          ['Comments', '', 'Threaded comments with author initials and timestamp. Enter to post. Posting refreshes the dashboard without closing the modal.'],
          ['Controls', 'Admin only', 'Type toggle (Action / Upcoming / Info), event date picker, status cycle, outcome textarea (when Done), Save button.'],
        ]} />
      </section>

      {/* Archive */}
      <section className="mb-12">
        <Eyebrow>Interface</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Email archive</h2>
        <FeatureList rows={[
          ['Search', '300ms debounce', 'Searches subject, sender name, from address. API-backed in production; client-side in demo mode.'],
          ['Pagination', '20 per page', 'Prev/next pagination. Sortable columns: received date, sender, subject.'],
          ['Opening an email', '', "Loads the email's linked task (if any) and opens the email modal. Works even if the task was dismissed — the underlying email is always kept."],
        ]} />
      </section>

      {/* Auth */}
      <section className="mb-12">
        <Eyebrow>System</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Auth &amp; roles</h2>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse font-mono tabular-nums">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 pr-6 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Capability</th>
                <th className="text-left py-2 pr-6 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Admin</th>
                <th className="text-left py-2 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Child</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['View dashboard & all tasks', true, true],
                ['Update status on own tasks', true, true],
                ['Add comments', true, true],
                ['Edit any task (type, assignee, dates)', true, false],
                ['Dismiss (delete) tasks', true, false],
                ['Manage tags', true, false],
                ['See Claude API error banner', true, false],
                ['Create user accounts', true, false],
              ].map(([cap, admin, child]) => (
                <tr key={String(cap)} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-6 text-slate-600 dark:text-slate-400 font-sans">{cap as string}</td>
                  <td className="py-2 pr-6 text-green-600 dark:text-green-400">{admin ? '✓' : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                  <td className="py-2">{child ? <span className="text-green-600 dark:text-green-400">✓</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FeatureList rows={[
          ['Auth mechanism', 'JWT', <>30-day JWT stored in localStorage as <Mono>fh_token</Mono>. 401 response auto-redirects to login and clears local storage.</>],
          ['Passwords', 'bcrypt', 'Hashed with bcrypt. No password reset flow currently.'],
        ]} />
      </section>

      {/* Deploy */}
      <section className="mb-12">
        <Eyebrow>System</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Deployment</h2>
        <FeatureList rows={[
          ['Mechanism', 'Server-side cron', <><Mono>poll-deploy.sh</Mono> runs every 2 minutes on the server via DirectAdmin cron. Compares remote vs local SHA; if different, runs <Mono>deploy.sh</Mono>. GitHub Actions does nothing — it just logs a note.</>],
          ['Deploy steps', '', <><Mono>git fetch → git reset --hard origin/main → npm install --production → mysql migration → touch tmp/restart.txt</Mono> (Passenger/LiteSpeed restart signal)</>],
          ['Frontend', 'Pre-built dist', <><Mono>client/dist</Mono> is committed to git (force-added despite .gitignore). Builds happen locally and are pushed; the server never runs <Mono>npm run build</Mono>.</>],
          ['Server', '', <>saltenfisk.com / 91.204.209.206. SSH: <Mono>u63375@hyperion.hostns.io</Mono>. Node via nodevenv/22. Port 3002 behind Passenger/LiteSpeed.</>],
          ['Safe tag', 'working-2026-06-24', <>Git tag at commit <Mono>f909d7f</Mono> — the last known-good state before the series of outages. Revert script available on server at <Mono>revert-to-safe.sh</Mono>.</>],
        ]} />
      </section>

      {/* Cleanup */}
      <section className="mb-12">
        <Eyebrow>System</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Cleanup notes</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-prose">Items in the codebase that are dead or should be addressed. None are currently causing problems.</p>
        <div className="border-t border-slate-200 dark:border-slate-700">
          {[
            { tag: 'Dead code', tagCls: 'text-slate-400 border-slate-300 dark:border-slate-600', text: <><Mono>src/routes/deploy.js</Mono> — GitHub webhook route. The file exists but is not mounted in <Mono>app.js</Mono>. The cron approach replaced it.</> },
            { tag: 'Dead code', tagCls: 'text-slate-400 border-slate-300 dark:border-slate-600', text: <>The DB columns <Mono>norm_subject</Mono> and <Mono>original_from</Mono> remain in the schema but are no longer written to.</> },
            { tag: 'Dead code', tagCls: 'text-slate-400 border-slate-300 dark:border-slate-600', text: <><Mono>client/src/components/RecentEmails.tsx</Mono> — earlier version of the email list, not imported anywhere. <Mono>EmailArchive.tsx</Mono> is the active replacement.</> },
            { tag: 'Divergence', tagCls: 'text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-700', text: <><Mono>DemoDashboard.tsx</Mono> sort logic should mirror the fix applied to <Mono>Dashboard.tsx</Mono> (sort Actions/Upcoming by date, not received). Currently the demo still sorts by received date.</> },
            { tag: 'Opportunity', tagCls: 'text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-700', text: <>Safe tag <Mono>working-2026-06-24</Mono> is now well behind HEAD. A new tag should be created once the current run of fixes has been stable for a few days.</> },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 py-3 border-b border-slate-100 dark:border-slate-800 items-baseline">
              <span className={`shrink-0 font-mono text-xs uppercase tracking-wide px-2 py-0.5 border rounded-sm ${item.tagCls}`}>{item.tag}</span>
              <span className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
    </div>
  )
}

// ── Small local components ──────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="font-mono text-xs uppercase tracking-widest text-teal-600 dark:text-teal-400 font-semibold">{children}</span>
      <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 py-0.5 rounded">{children}</code>
  )
}

function FeatureList({ rows }: { rows: [string, string, React.ReactNode][] }) {
  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      {rows.map(([key, sub, val], i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="pt-0.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{key}</div>
            {sub && <div className="font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
          </div>
          <div className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs sm:text-sm">{val}</div>
        </div>
      ))}
    </div>
  )
}
