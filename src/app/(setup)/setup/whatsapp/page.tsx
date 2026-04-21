import WizardShell from '@/components/setup/WizardShell'
import WhatsAppLinker from '@/components/setup/WhatsAppLinker'
import { readState } from '@/lib/setup-state'
import { linkWhatsAppAction, resetWhatsAppAction } from '@/lib/setup-actions'

export const dynamic = 'force-dynamic'

export default async function WhatsAppStep() {
  const state = await readState()

  return (
    <WizardShell
      step="whatsapp"
      title="Let's connect your WhatsApp"
      intro="The bot lives in WhatsApp — that's how you'll talk to it and get alerts about your team."
      demoNote="Demo mode — QR simulated"
      help={<>
        <strong>What happens here?</strong> In production, you&apos;d scan this QR with your phone and send &quot;Hi&quot; to our WhatsApp bot — we&apos;d detect it and link your number. Since this demo doesn&apos;t talk to real WhatsApp, tapping the QR <em>simulates</em> a successful scan.
      </>}
    >
      <WhatsAppLinker
        initialLinked={state.whatsapp.linked}
        initialPhone={state.whatsapp.phone}
        onSimulateLink={linkWhatsAppAction}
        onRegenerate={resetWhatsAppAction}
      />
    </WizardShell>
  )
}
