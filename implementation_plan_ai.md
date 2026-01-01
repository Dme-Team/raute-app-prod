# AI Brain Implementation Plan (Week 3)

Based on the roadmap:
- **Tue Jan 7**: Gemini Setup: API Key + Route.
- **Wed Jan 8**: Prompt Engineering: JSON Extraction.
- **Thu Jan 9**: Parse UI: Paste button & Auto-fill.
- **Fri Jan 10**: Testing: Email/SMS formats + Error handling.
- **Mon Jan 13**: Polish: Cancel btn, Success toasts, Empty states.

## Technical Approach (Adapting for Static Export)
Since the app uses `output: 'export'` for Capacitor, we cannot use Next.js API Routes (`app/api`). We have two options:
1.  **Supabase Edge Functions** (Best Practice for Production): Securely holds the API key.
2.  **Client-Side Integration** (Fastest for Prototyping): Calls Gemini directly from the browser/device.

**Decision**: We will implement a **Client-Side Service** initially for rapid development of the "AI Brain". We can migrate to Edge Functions later if needed for key security.

## Step-by-Step Implementation

### Phase 1: Setup & Configuration
- [ ] Install Google Generative AI SDK: `npm install @google/generative-ai`
- [ ] Add `NEXT_PUBLIC_GEMINI_API_KEY` to `.env.local`.
- [ ] Create `lib/ai.ts` service to handle Gemini interactions.

### Phase 2: Prompt Engineering
- [ ] Define the system prompt in `lib/ai.ts`.
- [ ] The prompt must instruct Gemini to extract:
    - `customer_name`
    - `address` (Street, City, State, Zip)
    - `phone`
    - `order_number` (if present)
    - `delivery_date` (if present, normalize to YYYY-MM-DD)
    - `notes` (summary of items or special instructions)
- [ ] Output format: Strict JSON.

### Phase 3: UI Integration (Orders Page)
- [ ] Modify `app/orders/page.tsx`.
- [ ] Add a "magic wand" or "Paste" button in the "Add Order" Sheet.
- [ ] Create a new UI state/dialog for "Paste Order Text".
- [ ] Implement the `handleAIParse` function to call `lib/ai.ts` and populate the form `ref` or state.

### Phase 4: Testing & Polish
- [ ] Test with sample SMS/Email formats.
- [ ] Handle errors (invalid text, API failure).
- [ ] Add loading states and success toasts.
