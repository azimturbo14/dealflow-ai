# DealFlow AI

**Transparent AI-Powered Startup Screening for Venture Funds**

Evaluate 1,000+ startup applications in seconds — not hours. Every decision is fully explainable.

## How It Works

DealFlow AI uses a **Decision Tree Classifier** trained on real startup outcome data (Crunchbase/Kaggle) to screen startups across 6 key criteria:

| Criterion | What It Measures |
|---|---|
| Previous Exit | Has a founder had a successful exit before? |
| Total Funding | How much capital has been raised? |
| Funding Rounds | How many funding rounds completed? |
| Time to First Funding | How quickly did they get funded? |
| Business Model | B2B vs B2C? |
| Team Size | How large is the founding team? |

## Transparency First

Every startup evaluation shows:
- **Score** (0-100%) with clear color coding
- **Strengths** — what the model found positive
- **Red Flags** — what the model flagged as risky
- **Decision Tree Path** — the exact logic chain the model followed
- **Risk Analysis** — detailed written risk assessment

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS 4, shadcn/ui
- **ML Engine**: scikit-learn Decision Tree Classifier (85%+ accuracy on training data)
- **Data**: 50 realistic Central Asian startup profiles for demo

## Demo

Click **"Load Demo Data"** on the home screen to evaluate 50 simulated startups instantly.

## Deployment

```bash
npm install
npm run dev
```

Built for a partnership pitch with [IT-Park Ventures](https://itparkventures.uz) — Uzbekistan's $10M VC fund and accelerator.