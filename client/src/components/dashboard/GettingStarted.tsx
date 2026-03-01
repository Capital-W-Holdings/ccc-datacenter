import { Link } from 'react-router-dom'
import { Search, Key, Building2, ArrowRight, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'

const steps = [
  {
    step: 1,
    title: 'Set Your API Key',
    description: 'Add your Anthropic API key to enable AI-powered enrichment',
    icon: Key,
    link: '/settings',
    linkText: 'Go to Settings',
  },
  {
    step: 2,
    title: 'Configure Your First Scraper',
    description: 'Set up a scraper to pull prospect data from conferences, directories, or company sites',
    icon: Search,
    link: '/research',
    linkText: 'Go to Research',
  },
  {
    step: 3,
    title: 'Review Target Companies',
    description: 'Check the pre-loaded list of data center industry companies to prioritize',
    icon: Building2,
    link: '/settings',
    linkText: 'View Companies',
  },
  {
    step: 4,
    title: 'Enrich Your Prospects',
    description: 'Use AI to categorize, score, and generate insights for your prospects',
    icon: Sparkles,
    link: '/enrichment',
    linkText: 'Start Enriching',
  },
]

export default function GettingStarted() {
  return (
    <Card padding="lg" className="bg-gradient-to-br from-brand-gold/5 to-transparent border-brand-gold/20">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-brand-gold" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-text-primary">
            Welcome to CCC Summit Intelligence
          </h2>
          <p className="text-text-secondary mt-1">
            Let&apos;s get your Data Center Dealmakers Summit pipeline set up. Follow these steps to start finding attendees, sponsors, and speakers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step) => (
          <Link
            key={step.step}
            to={step.link}
            className="group p-4 bg-white rounded-xl border border-border hover:border-brand-gold hover:shadow-card-hover transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                <step.icon className="w-4 h-4 text-brand-gold" />
              </div>
              <span className="text-xs font-mono text-brand-gold">
                Step {step.step}
              </span>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">{step.title}</h3>
            <p className="text-sm text-text-muted mb-3">{step.description}</p>
            <div className="flex items-center gap-1 text-sm font-medium text-brand-gold group-hover:gap-2 transition-all">
              {step.linkText}
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
