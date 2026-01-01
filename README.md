# Raute - Route Optimization Application

A mobile-first SaaS application for route optimization and delivery management.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Mobile**: Capacitor 6 (iOS support)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend/Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React

## Project Structure

```
raute-app/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with mobile viewport config
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   └── ui/                # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── sheet.tsx
│       └── tabs.tsx
├── lib/
│   └── utils.ts           # Utility functions
├── supabase/
│   └── schema.sql         # Database schema with tables and triggers
├── public/                # Static assets
├── capacitor.config.ts    # Capacitor configuration
├── next.config.ts         # Next.js config (static export enabled)
└── package.json
```

## Database Schema

The Supabase schema includes:

### Tables
- **companies** - Multi-tenant company data
- **users** - User accounts with role-based access (admin, manager, driver)
- **drivers** - Driver information and status
- **orders** - Delivery orders with routing information

### Key Features
- **Driver Limit Trigger**: Enforces maximum of 30 active drivers per company
- **Auto-updated timestamps**: Automatic `updated_at` column updates
- **Row Level Security (RLS)**: Multi-tenant security policies
- **Optimized indexes**: For performance on common queries

## Getting Started

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
```

This creates a static export in the `out/` directory.

### Mobile Development

#### Add iOS Platform

```bash
npx cap add ios
```

#### Sync with Native Platform

After building:

```bash
npm run build
npx cap sync
```

#### Open in Xcode

```bash
npx cap open ios
```

## Configuration

### Mobile Viewport

The app is configured with optimal mobile viewport settings:
- Width: device-width
- Initial scale: 1
- Maximum scale: 1
- User scalable: false (prevents zoom on input focus)

### Static Export

Next.js is configured with `output: 'export'` for Capacitor compatibility.

### Capacitor

- **App ID**: com.raute.app
- **App Name**: Raute
- **Web Directory**: out

## Environment Setup

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Next Steps

1. **Setup Supabase Project**
   - Create a new Supabase project
   - Run the schema.sql file in the SQL editor
   - Get your project URL and anon key

2. **Configure Environment Variables**
   - Add Supabase credentials to `.env.local`

3. **Create Supabase Client**
   - Add a `lib/supabase.ts` file for the Supabase client

4. **Build Features**
   - Authentication
   - Order management
   - Route optimization
   - Driver assignment
   - Real-time tracking

5. **iOS Deployment**
   - Add iOS platform
   - Configure app icons and splash screens
   - Test on simulator/device
   - Submit to App Store

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server (note: export mode doesn't support this)
- `npm run lint` - Run ESLint

## Important Notes

- The app uses static export (`output: 'export'`) which is required for Capacitor
- API routes are not supported in export mode - use Supabase for backend
- The driver limit (30 max) is enforced at the database level via trigger
- All tables have Row Level Security enabled for multi-tenant isolation

## License

Proprietary - All rights reserved
