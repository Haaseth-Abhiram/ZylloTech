# Zyllo Tech - Full-Stack Website Clone

A high-fidelity clone of [zyllotech.com](https://zyllotech.com/) built with **HTML5, CSS3, Bootstrap 5, JavaScript**, and a **Node.js + Express + SQLite** backend.

---

## 🚀 Quick Start Guide

### 1. Start the Server
Open your terminal in `E:\zyllotech` and run:
```bash
npm start
```
Or with Node directly:
```bash
node server.js
```

### 2. Open the Website in Your Browser
Visit:
```
http://localhost:3000
```

---

## 🔑 Demo Login Accounts

The database comes pre-seeded with two accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@zyllotech.com` | `admin123` |
| **Client** | `user@zyllotech.com` | `user123` |

> *You can also create new accounts instantly using the **Sign Up** tab on the login page.*

---

## 🌟 Key Features & Replicated Components

1. **Exact Navigation Bar**:
   - Sticky glassmorphic design (`backdrop-filter: blur(14px)`)
   - Official Zyllo Tech branding with orange-to-cyan gradient text
   - Nav links: Home, About Us, Services (with interactive dropdown), Industries, Portfolio, Blog, Careers, Contact Us
   - **Quick Search Modal** (`Ctrl+K` or search button) to instantly search services and pages
   - **Dynamic Login Button**: Automatically switches to user menu and Dashboard button when logged in

2. **Faithful Login & Registration (`/login`)**:
   - Replicated layout from `zyllotech.com/login`
   - High-resolution robotic AI backdrop (`robo.jpg`) with dark radial gradient overlay
   - Floating "Back to Home" pill button
   - Glowing gradient border container (`#f96706` to `#3089a6`)
   - Interactive pill toggle between **Sign In** and **Sign Up**
   - Password reveal / hide toggle
   - 1-Click demo credential auto-fill buttons
   - Feature highlights: *Real-time visibility*, *Unified team workspace*, *Permissioned access*
   - Direct integration with SQLite database

3. **Client & Admin Portal (`/dashboard`)**:
   - Live metrics: Total Inquiries, New Leads, Active Projects, SQLite database health
   - Table of inquiries submitted through the website contact forms
   - Modal to inspect full inquiry details and update status (*New*, *In Review*, *Contacted*, *Closed*)
   - Ability to add new inquiries or project notes directly from the portal

4. **Interactive Homepage (`/`)**:
   - **Hero Section**: High-impact headlines, stats ticker (50+ Projects, 99.4% Satisfaction, 14+ Countries, 24/7 Collaboration)
   - **Services Grid**: Software Development, Web Applications, Mobile Development, AI & Machine Learning, Cloud & DevOps, UI/UX Design
   - **Industries We Empower**: FinTech, Healthcare, E-Commerce, Logistics, Real Estate, EdTech
   - **Interactive Project Cost & Timeline Estimator**: Interactive calculator that gives real-time estimates
   - **Portfolio & Case Studies**: Filterable project gallery (All, AI/ML, Web, Mobile)
   - **Tech Blog & Careers Sections**
   - **Database-Connected Contact Form**: Saves directly into SQLite `inquiries` table with instant feedback

---

## 📁 Project Structure

```
E:\zyllotech\
├── package.json               # Node.js dependencies (express, sqlite3, bcryptjs, jwt, cors)
├── server.js                 # Express server with REST API routes & static serving
├── database.js               # SQLite database setup, table creation & seeding
├── zyllotech.db              # SQLite database file
├── README.md                 # Project documentation
└── public\                   # Frontend static files (Individual Dedicated Pages)
    ├── index.html            # 1. Main landing page (/)
    ├── about.html            # 2. Dedicated About Us page (/about)
    ├── services.html         # 3. Dedicated Services catalog (/services)
    ├── industries.html       # 4. Dedicated Industries page (/industries)
    ├── portfolio.html        # 5. Dedicated Case Studies gallery (/portfolio)
    ├── blog.html             # 6. Dedicated Tech Blog & Insights (/blog)
    ├── careers.html          # 7. Dedicated Careers & Application form (/careers)
    ├── contact.html          # 8. Dedicated Contact & Inquiry form (/contact)
    ├── login.html            # 9. Dedicated Sign In & Registration (/login)
    ├── dashboard.html        # 10. Dedicated Client & Admin portal (/dashboard)
    └── assets\
        ├── css\
        │   └── style.css     # Custom dark theme, glassmorphism, brand gradients
        ├── js\
        │   └── main.js       # Search modal, auth checks, form submission, cost calculator
        └── images\
            ├── zyllo-logo.png
            ├── zyllo-icon.png
            ├── Zyllo_Tech_Favicon_512x512.png
            └── robo.jpg
```

---

## 🛠️ How to Customize

- **Change Brand Colors**: Modify `--brand-orange: #f96706;` and `--brand-cyan: #3089a6;` in `public/assets/css/style.css`.
- **Change Company Details**: Edit the address, phone, or email in `public/index.html` and `public/contact.html`.
- **Add / Remove Services**: Update service cards in `public/index.html` and `public/services.html`.
- **Database Schema**: Add more fields or tables in `database.js`.
