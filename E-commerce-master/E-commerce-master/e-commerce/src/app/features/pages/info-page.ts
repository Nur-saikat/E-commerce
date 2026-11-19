import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Icon } from '../../shared/components/icon/icon';
import { ContentService } from '../../core/services/content.service';

interface InfoSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface InfoFaq {
  question: string;
  answer: string;
}

interface InfoContent {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoSection[];
  faq?: InfoFaq[];
}

const CONTENT: Record<string, InfoContent> = {
  about: {
    eyebrow: 'Our story',
    title: 'Considered design, made to last.',
    intro:
      'Safwan is a curated edit of everyday essentials chosen for the way they feel, the way they age and the way they fit into real life. We work with independent makers and established houses alike, favouring natural materials, honest construction and a quieter kind of luxury.',
    sections: [
      {
        heading: 'How we choose',
        paragraphs: [
          'Every piece in our collection is selected by a small team of buyers who test, wear and live with the products before they earn a place in the edit. We look for thoughtful details, repairable construction and materials that improve with time.',
          'We keep the assortment deliberately tight. Rather than endless choice, we offer a considered set of pieces we genuinely believe in.'
        ],
        bullets: [
          'Natural and responsibly sourced materials wherever possible',
          'Made by partners we know personally and visit regularly',
          'Packaging designed to be recycled, reused or composted'
        ]
      },
      {
        heading: 'Built around you',
        paragraphs: [
          'From transparent pricing to a 30-day return window, we try to make buying well the easiest option. Orders are tracked from dispatch to doorstep, and our support team is available to help with sizing, care and anything else.',
          'We are a small team — when you email us, a person reads it.'
        ]
      }
    ]
  },
  faq: {
    eyebrow: 'Support',
    title: 'Frequently asked questions',
    intro: 'Everything you need to know about ordering, delivery, returns and caring for your pieces. Still stuck? Our team is one message away.',
    sections: [],
    faq: [
      {
        question: 'How long does delivery take?',
        answer:
          'Standard delivery takes 3–5 business days after dispatch. Express delivery arrives within 1–2 business days. Available options and exact costs are shown at checkout based on your address.'
      },
      {
        question: 'What is your returns policy?',
        answer:
          'Unused items in their original condition may be returned within 30 days of delivery. Start a return from your order page or contact us and we will arrange the details. Refunds are issued to the original payment method.'
      },
      {
        question: 'Can I change or cancel an order?',
        answer:
          'Orders can be cancelled from your account while they are still pending or confirmed. Once an order has shipped, please contact us and we will help with a return instead.'
      },
      {
        question: 'Which payment methods do you accept?',
        answer:
          'Available payment methods are shown at checkout and depend on your region. We support cash on delivery where available, as well as secure card payments through our payment partners. Card details are never stored on our servers.'
      },
      {
        question: 'How do I care for my pieces?',
        answer:
          'Each product page includes care guidance. As a rule, wash less often, use cool water and gentle detergent, and air dry where possible. Natural materials like linen and wool will soften beautifully with age.'
      },
      {
        question: 'Do you ship internationally?',
        answer:
          'Shipping options are calculated at checkout based on your delivery address. Duties and taxes, where applicable, are included in the estimated tax shown before you confirm your order.'
      }
    ]
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy policy',
    intro:
      'We collect only what we need to fulfil your order, improve your experience and keep your account secure. This policy explains what we store, why we store it and the choices you have.',
    sections: [
      {
        heading: 'Information we collect',
        bullets: [
          'Account details such as your name, email address, phone number and saved addresses',
          'Order information including items purchased, delivery details and payment status',
          'Technical information such as device type and pages visited, used in aggregate to improve the store',
          'Messages you send to our support team'
        ]
      },
      {
        heading: 'How we use your information',
        paragraphs: [
          'We use your information to process orders, provide customer support, prevent fraud and meet legal obligations. With your consent, we may send you product updates and offers; you can unsubscribe at any time.',
          'We do not sell your personal information. Payment card details are handled directly by our payment providers and are never stored on our servers.'
        ]
      },
      {
        heading: 'Your choices',
        paragraphs: [
          'You can update your profile and addresses from your account at any time. To request a copy of your data or ask for your account to be deleted, contact our team. We will respond within 30 days.',
          'Cookies are used for essential functionality such as keeping your bag up to date. You can control non-essential cookies through your browser settings.'
        ]
      }
    ]
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of service',
    intro:
      'These terms govern your use of the Safwan store and the purchase of products from us. By placing an order you agree to these terms.',
    sections: [
      {
        heading: 'Orders and acceptance',
        paragraphs: [
          'An order is an offer to purchase. We confirm acceptance when your order is dispatched. If an item is unavailable, we will contact you and arrange a refund or alternative.',
          'Prices are shown in the store currency and include applicable taxes where stated. Delivery costs are shown before checkout is complete.'
        ]
      },
      {
        heading: 'Payments',
        bullets: [
          'Payment must be received before an order is confirmed, except where cash on delivery is offered',
          'Online payments are verified securely by our backend before orders are confirmed',
          'We never store full card numbers on our servers'
        ]
      },
      {
        heading: 'Returns and refunds',
        paragraphs: [
          'Unused items may be returned within 30 days of delivery. Items must be in their original condition with tags attached. Refunds are issued to the original payment method once the return has been received and inspected.',
          'Made-to-order, personalised and intimate items are excluded from our standard returns policy for hygiene and customisation reasons.'
        ]
      },
      {
        heading: 'Account responsibility',
        paragraphs: [
          'You are responsible for keeping your account credentials secure. Notify us immediately if you believe your account has been used without your permission.',
          'We may suspend accounts used for fraudulent activity, abuse or attempts to disrupt the service.'
        ]
      }
    ]
  },
  shipping: {
    eyebrow: 'Delivery',
    title: 'Shipping & returns',
    intro:
      'Orders are packed with care and dispatched from our warehouse. Delivery options and costs are calculated at checkout so there are no surprises.',
    sections: [
      {
        heading: 'Delivery times',
        bullets: [
          'Standard delivery: 3–5 business days after dispatch',
          'Express delivery: 1–2 business days after dispatch',
          'Remote destinations may require an additional 1–2 days',
          'Tracking details are emailed as soon as your order leaves our warehouse'
        ]
      },
      {
        heading: 'Free delivery',
        paragraphs: [
          'Standard delivery is free on orders above the threshold shown in your bag. The progress bar in your bag shows exactly how close you are.',
          'Free-delivery thresholds apply to the order subtotal after discounts and before tax.'
        ]
      },
      {
        heading: 'Returns in three steps',
        bullets: [
          'Open your order and select the items you wish to return, or contact our team',
          'Reuse the original packaging and attach the return label we provide',
          'Drop the parcel at the nominated carrier; refunds are issued once it arrives'
        ]
      },
      {
        heading: 'Faulty items',
        paragraphs: [
          'If something arrives damaged or faulty, contact us within 14 days with a photo and your order number. We will arrange a replacement or refund and cover return shipping.'
        ]
      }
    ]
  }
};

@Component({
  selector: 'app-info-page',
  standalone: true,
  imports: [RouterLink, Icon],
  template: `
    <div class="container-luxe py-10 lg:py-14">
      <div class="mx-auto max-w-3xl">
        <p class="eyebrow">{{ content().eyebrow }}</p>
        <h1 class="section-title mt-2">{{ content().title }}</h1>
        <p class="mt-4 text-sm leading-relaxed text-ink-600 sm:text-base">{{ content().intro }}</p>

        @if (content().sections.length) {
          <div class="mt-10 space-y-8">
            @for (section of content().sections; track section.heading) {
              <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-7">
                <h2 class="font-display text-xl font-semibold text-ink-900">{{ section.heading }}</h2>
                @for (paragraph of section.paragraphs ?? []; track paragraph) {
                  <p class="mt-3 text-sm leading-relaxed text-ink-600">{{ paragraph }}</p>
                }
                @if (section.bullets?.length) {
                  <ul class="mt-3 space-y-2">
                    @for (bullet of section.bullets; track bullet) {
                      <li class="flex items-start gap-2.5 text-sm leading-relaxed text-ink-600">
                        <app-icon name="check" [size]="15" class="mt-0.5 shrink-0 text-gold-600" />
                        <span>{{ bullet }}</span>
                      </li>
                    }
                  </ul>
                }
              </section>
            }
          </div>
        }

        @if (content().faq?.length) {
          <div class="mt-10 space-y-3">
            @for (item of content().faq; track item.question; let i = $index) {
              <div class="overflow-hidden rounded-2xl border border-ink-100 bg-white">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  [attr.aria-expanded]="openFaq() === i"
                  (click)="openFaq.set(openFaq() === i ? -1 : i)"
                >
                  <span class="text-sm font-semibold text-ink-900">{{ item.question }}</span>
                  <app-icon [name]="openFaq() === i ? 'chevron-up' : 'chevron-down'" [size]="16" class="shrink-0 text-ink-400" />
                </button>
                @if (openFaq() === i) {
                  <p class="border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-600">{{ item.answer }}</p>
                }
              </div>
            }
          </div>
        }

        <div class="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink-900 p-6 text-cream sm:flex-row sm:items-center">
          <div>
            <p class="font-display text-xl font-semibold">Still have a question?</p>
            <p class="mt-1 text-sm text-cream/60">Our team usually replies within one business day.</p>
          </div>
          <a routerLink="/contact" class="btn-gold shrink-0">Contact us <app-icon name="arrow-right" [size]="15" /></a>
        </div>

        <p class="mt-6 text-center text-xs text-ink-400">
          Last updated {{ updated }} · {{ content().eyebrow === 'Legal' ? 'Questions? Contact support.' : 'Safwan — ' + (settings()?.tagline ?? 'Curated essentials for modern living') }}
        </p>
      </div>
    </div>
  `
})
export class InfoPage {
  private readonly route = inject(ActivatedRoute);
  private readonly contentService = inject(ContentService);

  readonly openFaq = signal(-1);
  readonly updated = 'November 2026';
  readonly settings = this.contentService.settings;

  readonly content = computed<InfoContent>(() => {
    const page = (this.route.snapshot.data['page'] as string) || 'about';
    return CONTENT[page] ?? CONTENT['about'];
  });
}
