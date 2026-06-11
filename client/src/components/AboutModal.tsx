import * as Dialog from '@radix-ui/react-dialog'
import { X, Info } from 'lucide-react'

export default function AboutModal() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="About FamilyHub"
          title="About FamilyHub"
        >
          <Info size={16} />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <Dialog.Title className="font-bold text-slate-900 dark:text-slate-100 text-base">
                <span className="text-orange-500">Family</span>Hub
              </Dialog.Title>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your family's email command centre</p>
            </div>
            <Dialog.Close asChild>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-5 text-sm text-slate-600 dark:text-slate-300">
            <p>
              FamilyHub monitors your family email inbox and uses AI to automatically
              sort incoming emails into tasks, upcoming events, and information — so
              nothing important gets buried.
            </p>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">The three panels</h3>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">Actions Required</span>
                  <span className="text-slate-500 dark:text-slate-400">— emails where something needs to be done: payments, forms, bookings, consents.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">Upcoming</span>
                  <span className="text-slate-500 dark:text-slate-400">— confirmed future events (camps, trips, appointments). Disappear automatically once the date passes.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">Info</span>
                  <span className="text-slate-500 dark:text-slate-400">— newsletters, confirmations, and updates that are good to know but need no action.</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">How to use it</h3>
              <ul className="space-y-1.5 text-slate-500 dark:text-slate-400">
                <li>• Forward emails to your family inbox and they'll appear within 2 minutes.</li>
                <li>• Click any row to open the full email and edit the type, who it's for, assignee, due date, and status.</li>
                <li>• Use the <span className="font-medium text-slate-600 dark:text-slate-300">Who / Assignee</span> filter chips to narrow down the list.</li>
                <li>• Hover a row and click <span className="font-medium text-slate-600 dark:text-slate-300">✕</span> to dismiss it — the email stays in the Archive.</li>
                <li>• Use the <span className="font-medium text-slate-600 dark:text-slate-300">Archive</span> tab to browse and search all emails, and to correct any misclassified ones.</li>
                <li>• Add comments to tasks to keep notes visible to the whole family.</li>
                <li>• Mark actions as <span className="font-medium text-slate-600 dark:text-slate-300">Done</span> once completed — they drop off the list.</li>
                <li>• Upcoming events disappear automatically once the date passes.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">AI classification</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Emails are analysed automatically but aren't always right. Open any task and use the
                <span className="font-medium text-slate-600 dark:text-slate-300"> Action / Upcoming / Info</span> toggle
                and <span className="font-medium text-slate-600 dark:text-slate-300">Who</span> chips to correct it before saving.
              </p>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
