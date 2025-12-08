import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

export function FAQSection() {
  return (
    <div id="faq" className="mt-16 scroll-mt-20">
      <div className="text-center mb-12">
        <p className="font-mono text-sm text-accent mb-2">// HELP CENTER</p>
        <h2 className="font-mono text-3xl font-bold mb-4">Frequently Asked Questions</h2>
        <p className="text-muted-foreground leading-relaxed">Everything you need to know about LLMO Directory</p>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="item-1" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            What is LLM Optimization (LLMO)?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            LLMO means <em>Large Language Model Optimization</em> — like SEO, but for AI systems and language
            models. It's the practice of making your content discoverable and understandable by AI assistants like
            ChatGPT, Claude, and other LLMs.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            Why should I list my site here?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            Because AI systems increasingly learn from structured directories. A listing improves your chance to be
            referenced by AI when users ask questions related to your content. It's like being in the index of a
            book that AI models read.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">How does the free plan work?</AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            You can add one link free for 3 months, then renew with a backlink or upgrade to Pro (€1/year per link).
            No credit card required to start. It's a risk-free way to test LLMO optimization for your content.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            What happens if I don't renew?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            The link will be hidden from the directory but can be reactivated anytime. We'll send you a reminder 7
            days before expiry so you never lose your listing unexpectedly.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            What's included in Pro and Agency plans?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            Pro adds automation and advanced analytics. Agency adds multi-link management and featured visibility.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-6" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            How do I renew my subscription?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            Pro and Agency plans auto-renew annually via Stripe. You'll receive email reminders 7 days before expiry. Free trial links expire after 3 months and can be renewed with a backlink or by upgrading to Pro.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-7" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            How does Analyzer Pro differ from Basic?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            Analyzer Pro provides advanced AI visibility scoring, detailed recommendations for llms.txt optimization, metadata suggestions, and automated monitoring. Basic Analyzer offers a simple readability score only.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-8" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            How is my payment handled?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            All payments are processed securely through Stripe. We accept major credit cards and debit cards. Your payment information is encrypted and never stored on our servers.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-9" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            How does automatic llms.txt generation work?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            Pro and Agency plans include automatic llms.txt file updates every 90 days. The system crawls your site, generates an optimized llms.txt file, and provides installation instructions. You can also manually regenerate anytime from your dashboard.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-10" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            What payment methods do you accept?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through Stripe. Payment is processed securely and automatically renews annually for Pro and Agency plans.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-11" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            How is this different from normal SEO directories?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            It's structured for AI understanding — LLMs can read and interpret your content better through semantic
            markup, structured data, and machine-readable formats. Traditional directories focus on human search
            engines; we focus on AI systems.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-12" className="border border-border rounded-lg px-6 bg-card">
          <AccordionTrigger className="font-mono hover:text-accent">
            How can I cancel my subscription?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            You can cancel anytime from your dashboard. Your links will remain active until the end of your current
            billing period. No questions asked, no hidden fees.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-12 text-center">
        <p className="font-mono text-sm text-muted-foreground mb-4">// Still have questions?</p>
        <p className="text-muted-foreground mb-4">
          Can't find the answer you're looking for? Contact our support team.
        </p>
        <Link href="/contact" className="text-accent hover:underline font-mono text-sm">
          Contact Support →
        </Link>
      </div>
    </div>
  );
}


