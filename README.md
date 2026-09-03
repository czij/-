# Personal Payments

A tiny static payment and receivables tracker. It runs directly on GitHub Pages and talks to Supabase from the browser.

Records are marked as either **收款** (money received) or **付款** (money paid out).
Payers are selected from a fixed personal list: Chunyang Tong, Xiaomeng Sun, Yijie Ru, Xiaoquan Zhang, Zijun Chen, or Bingbing.
Payment types are selected from: 租金, Utility, and 押金.

`planner.html` is a separate monthly payment calculator. It stores the entered rent and Utility amounts in that browser only, restores them when you return to a month, and always keeps USD and CNY totals separate.

## Set up Supabase

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. In **SQL Editor**, open `supabase.sql`, replace every `YOUR_EMAIL@example.com` with your own sign-in email, then run it.
3. In **Authentication → Users**, create an email/password user using that exact email. For a personal tool, do not enable public sign-ups.
4. In **Project Settings → API**, copy the Project URL and the anon (or publishable) key. Never use the `service_role` key in this project.
5. Edit `config.js` and paste those two values.

## Why this is secure enough for personal use

The Supabase key in `config.js` is intentionally public: GitHub Pages serves it to visitors. Security comes from Supabase Auth plus the RLS policies in `supabase.sql`. Only a signed-in user whose JWT email matches the email you set in the policies can read, add, edit, or delete records. Visitors with only the public key cannot modify your data.

Keep RLS enabled. Do not replace these policies with anonymous/public write policies, and do not put a service-role key in `config.js`.

## Test locally

After configuring `config.js`, serve this folder with any static web server. For example, if Python is installed:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`, sign in, and add a test payment.

## Deploy to GitHub Pages

1. Create a new GitHub repository and add these six project files to its root.
2. Commit and push the files to GitHub.
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the branch containing the files (usually `main`) and folder **/(root)**, then save.
6. GitHub will publish the site at the URL shown on that page. Open it and sign in.

No build step or server is required. If your GitHub repository is public, `config.js` remains visible by design; it contains only the public Supabase key, never a service-role secret.
