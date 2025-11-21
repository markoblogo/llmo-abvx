import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-mono font-semibold mb-3 text-sm">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono font-semibold mb-3 text-sm">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono font-semibold mb-3 text-sm">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono font-semibold mb-3 text-sm">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://x.com/abv_creative"
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors glow-accent-text"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/markoblogo"
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors glow-accent-text"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://medium.com/@abvcreative"
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-[#00FF9C] transition-colors glow-accent-text"
                >
                  Medium
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground font-mono">© 2025 LLMO Directory — "Be Visible to AI."</p>
            <p className="text-xs text-muted-foreground font-mono">// SYSTEM: LLM Optimization Platform v1.0</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
