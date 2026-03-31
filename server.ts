import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";

// --- SMTP Configuration ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const safeStringify = (obj: any, indent = 2) => {
  const cache = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);

          // Handle common objects that might cause issues
          const constructorName = value.constructor?.name;
          if (constructorName && (constructorName.length <= 3)) {
            return `[${constructorName}]`;
          }
        }
        return value;
      },
      indent
    );
  } catch (err) {
    return '[Serialization Error]';
  }
};

const safeLog = (message: string, ...args: any[]) => {
  const safeArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        const stringified = safeStringify(arg, 0);
        if (stringified.startsWith('"[') && stringified.endsWith(']"')) {
          return stringified.slice(1, -1);
        }
        return JSON.parse(stringified);
      } catch (e) {
        return arg;
      }
    }
    return arg;
  });
  console.log(message, ...safeArgs);
};

const safeError = (message: string, ...args: any[]) => {
  const safeArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        const stringified = safeStringify(arg, 0);
        if (stringified.startsWith('"[') && stringified.endsWith(']"')) {
          return stringified.slice(1, -1);
        }
        return JSON.parse(stringified);
      } catch (e) {
        return arg;
      }
    }
    return arg;
  });
  console.error(message, ...safeArgs);
};

async function sendEmail(to: string, subject: string, html: string) {
  safeLog(`Attempting to send email to: ${to} with subject: ${subject}`);
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    safeLog("SMTP credentials not provided. Email not sent.");
    return;
  }
  
  const finalHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 800; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; font-style: italic; }
        .content { padding: 40px; color: #1f2937; }
        .footer { background-color: #f9fafb; color: #6b7280; padding: 30px 20px; text-align: center; font-size: 13px; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 8px 0; }
        .footer .contact-info { color: #4f46e5; font-weight: 600; }
        .button { display: inline-block; background-color: #4f46e5; color: white !important; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 25px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39); }
        .divider { border: none; border-top: 1px solid #f3f4f6; margin: 30px 0; }
        .bilingual-section { margin-top: 25px; padding-top: 25px; border-top: 1px dashed #e5e7eb; color: #4b5563; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ruma Water Solutions</h1>
          <p>Pure Water, Pure Life | বিশুদ্ধ জল, বিশুদ্ধ জীবন</p>
        </div>
        <div class="content">
          ${html}
        </div>
        <div class="footer">
          <p><strong>Ruma Water Solutions</strong></p>
          <p class="contact-info">Whatsapp: +91 8420289264 | rumawatersolutions@gmail.com</p>
          <p>Address: Kolkata, West Bengal, India</p>
          <p>© 2026 Ruma Water Solutions. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    safeLog(`Sending email using transporter...`);
    const info = await transporter.sendMail({
      from: `"Ruma Water Solutions" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: finalHtml,
    });
    safeLog(`Email sent successfully: ${info.messageId}`);
  } catch (error) {
    safeError("Error sending email via transporter:", error);
  }
}

// --- Simple JSON Database ---
const DB_FILE = path.join(process.cwd(), "db.json");

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: "user" | "admin";
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
  barcode?: string;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: { productId: string; quantity: number; price: number; name: string }[];
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered";
  createdAt: string;
}

interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  name: string;
  email: string;
  problemType: string;
  details: string;
  createdAt: string;
}

interface Settings {
  appName: string;
  tagline?: string;
  aboutUs: string;
  paymentMethods: string[];
  adminPassword: string;
}

interface Database {
  users: User[];
  products: Product[];
  orders: Order[];
  reviews: Review[];
  tickets: Ticket[];
  settings: Settings;
}

const defaultDb: Database = {
  users: [],
  products: [
    {
      id: "p1",
      name: "Wireless Headphones",
      description: "High-quality noise-canceling headphones.",
      price: 199.99,
      category: "Electronics",
      imageUrl: "https://picsum.photos/seed/headphones/400/400",
      stock: 50,
    },
    {
      id: "p2",
      name: "Mechanical Keyboard",
      description: "RGB mechanical keyboard with tactile switches.",
      price: 129.50,
      category: "Electronics",
      imageUrl: "https://picsum.photos/seed/keyboard/400/400",
      stock: 20,
    },
    {
      id: "p3",
      name: "Flexon Water Tank",
      description: "Durable and high-capacity water storage tank.",
      price: 4500.00,
      category: "Water Solutions",
      imageUrl: "https://picsum.photos/seed/watertank/400/400",
      stock: 15,
    },
  ],
  orders: [],
  reviews: [],
  tickets: [],
  settings: {
    appName: "Ruma",
    tagline: "water solutions",
    aboutUs: "Welcome to Ruma Water Solutions, providing clean and safe water for everyone.",
    paymentMethods: ["Credit Card", "PayPal"],
    adminPassword: "Anindya@0333",
  },
};

function readDb(): Database {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
      return defaultDb;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    if (!content.trim()) {
      return defaultDb;
    }
    return JSON.parse(content);
  } catch (error) {
    safeError("Error reading database file:", error);
    return defaultDb;
  }
}

function writeDb(data: Database) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Initialize DB
readDb();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  app.use(express.json());
  app.use(cookieParser());

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"] || "user";
    
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    req.user = { id: userId, role: userRole };
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    // Restriction relaxed as per user request to keep admin and user pages same for now
    // if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
  };

  // --- API Routes ---

  // Auth: Google OAuth URL
  app.get("/api/auth/google/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/auth/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "email profile",
      access_type: "offline",
      prompt: "consent",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    res.json({ url });
  });

  // Auth: Google OAuth Callback (Mocked for Preview/Sandbox)
  app.post("/api/auth/google/callback", (req, res) => {
    const { code } = req.body;
    // In a real app, exchange code for tokens. Here we mock it for the sandbox.
    // If no real Client ID is provided, we simulate a successful login.
    const db = readDb();
    
    // Mock user data
    const mockEmail = "user@example.com";
    let user = db.users.find((u) => u.email === mockEmail);
    if (!user) {
      user = {
        id: `u_${Date.now()}`,
        email: mockEmail,
        name: "Demo User",
        picture: "https://picsum.photos/seed/user/100/100",
        role: db.users.length === 0 ? "admin" : "user", // First user is admin
      };
      db.users.push(user);
      writeDb(db);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ user });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  });

  // Products
  app.get("/api/products", (req, res) => {
    const db = readDb();
    res.json(db.products);
  });

  app.post("/api/products", authenticate, requireAdmin, (req, res) => {
    const db = readDb();
    const newProduct: Product = { id: `p_${Date.now()}`, ...req.body };
    db.products.push(newProduct);
    writeDb(db);
    io.emit("products_updated", db.products);
    res.status(201).json(newProduct);
  });

  app.put("/api/products/:id", authenticate, requireAdmin, (req, res) => {
    const db = readDb();
    const index = db.products.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Not found" });
    db.products[index] = { ...db.products[index], ...req.body };
    writeDb(db);
    io.emit("products_updated", db.products);
    res.json(db.products[index]);
  });

  app.delete("/api/products/:id", authenticate, requireAdmin, (req, res) => {
    const db = readDb();
    db.products = db.products.filter((p) => p.id !== req.params.id);
    writeDb(db);
    io.emit("products_updated", db.products);
    res.json({ success: true });
  });

  // Orders
  app.get("/api/orders", authenticate, (req: any, res) => {
    const db = readDb();
    if (req.user.role === "admin") {
      res.json(db.orders);
    } else {
      res.json(db.orders.filter((o) => o.userId === req.user.id));
    }
  });

  app.post("/api/orders", authenticate, (req: any, res) => {
    const db = readDb();
    const { items, total } = req.body;
    const user = db.users.find((u) => u.id === req.user.id);
    
    if (!user) return res.status(404).json({ error: "User not found" });

    const newOrder: Order = {
      id: `o_${Date.now()}`,
      userId: req.user.id,
      userName: user.name,
      userEmail: user.email,
      items,
      total,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    db.orders.push(newOrder);
    
    // Update stock
    items.forEach((item: any) => {
      const product = db.products.find(p => p.id === item.productId);
      if (product) product.stock -= item.quantity;
    });

    writeDb(db);
    io.emit("orders_updated", db.orders);
    io.emit("products_updated", db.products);
    res.status(201).json(newOrder);
  });

  app.put("/api/orders/:id/status", authenticate, requireAdmin, (req, res) => {
    const db = readDb();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    order.status = req.body.status;
    writeDb(db);
    io.emit("orders_updated", db.orders);
    res.json(order);
  });

  // Reviews
  app.get("/api/products/:id/reviews", (req, res) => {
    const db = readDb();
    const reviews = db.reviews.filter((r) => r.productId === req.params.id);
    // Attach user info
    const reviewsWithUser = reviews.map(r => {
      const user = db.users.find(u => u.id === r.userId);
      return { ...r, userName: user?.name || "Anonymous", userPicture: user?.picture };
    });
    res.json(reviewsWithUser);
  });

  app.post("/api/products/:id/reviews", authenticate, async (req: any, res) => {
    const db = readDb();
    const product = db.products.find(p => p.id === req.params.id);
    const user = db.users.find(u => u.id === req.user.id);
    
    const newReview: Review = {
      id: `r_${Date.now()}`,
      productId: req.params.id,
      userId: req.user.id,
      rating: req.body.rating,
      text: req.body.text,
      createdAt: new Date().toISOString(),
    };
    db.reviews.push(newReview);
    writeDb(db);
    io.emit("reviews_updated", { productId: req.params.id });

    // Send review notification to admin
    if (product && user) {
      const reviewHtml = `
        <h2 style="color: #4f46e5;">New Product Review / নতুন পণ্য পর্যালোচনা</h2>
        <p><strong>Product / পণ্য:</strong> ${product.name}</p>
        <p><strong>Customer / গ্রাহক:</strong> ${user.name} (${user.email})</p>
        <p><strong>Rating / রেটিং:</strong> ${"⭐".repeat(newReview.rating)} (${newReview.rating}/5)</p>
        <p><strong>Comment / মন্তব্য:</strong></p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; font-style: italic; color: #374151;">
          "${newReview.text}"
        </div>
      `;
      await sendEmail("rumawatersolutions@gmail.com", `New Review for ${product.name} / ${product.name}-এর জন্য নতুন পর্যালোচনা`, reviewHtml);
    }

    res.status(201).json(newReview);
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const db = readDb();
    res.json(db.settings);
  });

  app.put("/api/settings", authenticate, requireAdmin, (req, res) => {
    const db = readDb();
    db.settings = { ...db.settings, ...req.body };
    writeDb(db);
    io.emit("settings_updated", db.settings);
    res.json(db.settings);
  });

  // Admin Password Check
  app.post("/api/admin-password", (req, res) => {
    const db = readDb();
    if (req.body.password === db.settings.adminPassword) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  // Admin Password Change
  app.put("/api/admin-password/change", authenticate, requireAdmin, (req, res) => {
    const db = readDb();
    if (req.body.oldPassword === db.settings.adminPassword) {
      db.settings.adminPassword = req.body.newPassword;
      writeDb(db);
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid old password" });
    }
  });

  // Admin Password Update (without auth, requires old password)
  app.put("/api/admin-password/update", (req, res) => {
    const db = readDb();
    if (req.body.oldPassword === db.settings.adminPassword) {
      db.settings.adminPassword = req.body.newPassword;
      writeDb(db);
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid old password" });
    }
  });

  // Support Ticket
  app.post("/api/support-ticket", async (req, res) => {
    const { name, email, problemType, details } = req.body;
    const db = readDb();
    const newTicket: Ticket = {
      id: `TIC-${Date.now()}`,
      name,
      email,
      problemType,
      details,
      createdAt: new Date().toISOString(),
    };
    if (!db.tickets) {
      db.tickets = [];
    }
    db.tickets.push(newTicket);
    writeDb(db);

    // Send email notification
    const emailHtml = `
      <h2 style="color: #4f46e5;">New Support Ticket / নতুন সাপোর্ট টিকিট</h2>
      <p><strong>Ticket ID / টিকিট আইডি:</strong> ${newTicket.id}</p>
      <p><strong>Name / নাম:</strong> ${name}</p>
      <p><strong>Email / ইমেল:</strong> ${email}</p>
      <p><strong>Problem Type / সমস্যার ধরণ:</strong> ${problemType}</p>
      <p><strong>Details / বিবরণ:</strong></p>
      <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; color: #374151;">
        ${details}
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Date / তারিখ: ${newTicket.createdAt}</p>
    `;
    
    // Send to admin
    await sendEmail("rumawatersolutions@gmail.com", `New Support Ticket: ${newTicket.id} / নতুন সাপোর্ট টিকিট`, emailHtml);
    
    // Send confirmation to user
    await sendEmail(email, `Support Ticket Received: ${newTicket.id} / সাপোর্ট টিকিট প্রাপ্ত হয়েছে`, `
      <h3 style="color: #4f46e5;">Hello ${name}, / নমস্কার ${name},</h3>
      <p>We have received your support ticket. Our team will get back to you as soon as possible.</p>
      <p>আমরা আপনার সাপোর্ট টিকিট পেয়েছি। আমাদের টিম যত তাড়াতাড়ি সম্ভব আপনার সাথে যোগাযোগ করবে।</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p><strong>Ticket ID / টিকিট আইডি:</strong> ${newTicket.id}</p>
        <p><strong>Your Message / আপনার বার্তা:</strong> ${details}</p>
      </div>
      <p>Thank you for reaching out to Ruma Water Solutions.</p>
      <p>Ruma Water Solutions-এর সাথে যোগাযোগ করার জন্য ধন্যবাদ।</p>
    `);

    res.status(201).json({ ticketId: newTicket.id });
  });

  // Order Notification
  app.post("/api/notify-order", authenticate, async (req: any, res) => {
    const { orderId, orderData } = req.body;
    safeLog("Received notify-order request:", { orderId, orderData });
    
    const adminEmailHtml = `
      <h2 style="color: #4f46e5;">New Order Received! / নতুন অর্ডার প্রাপ্ত হয়েছে!</h2>
      <p><strong>Order ID / অর্ডার আইডি:</strong> ${orderId}</p>
      <p><strong>Customer / গ্রাহক:</strong> ${orderData.userName} (${orderData.userEmail})</p>
      <p><strong>Phone / ফোন:</strong> ${orderData.phone}</p>
      <p><strong>Total Amount / মোট পরিমাণ:</strong> ₹${orderData.total}</p>
      <p><strong>Payment Method / পেমেন্ট পদ্ধতি:</strong> ${orderData.paymentMethod.toUpperCase()}</p>
      ${orderData.utrNumber ? `<p><strong>UTR Number / ইউটিআর নম্বর:</strong> ${orderData.utrNumber}</p>` : ''}
      
      <h3 style="border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 30px;">Items / আইটেম:</h3>
      <ul style="list-style: none; padding: 0;">
        ${orderData.items.map((item: any) => `
          <li style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between;">
            <span>${item.name} x ${item.quantity}</span>
            <span style="font-weight: bold; color: #4f46e5;">₹${item.price}</span>
          </li>
        `).join('')}
      </ul>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-top: 30px; border: 1px solid #e5e7eb;">
        <p><strong>Shipping Address / শিপিং ঠিকানা:</strong></p>
        <p style="margin: 0; color: #374151;">${orderData.shippingAddress}</p>
      </div>
    `;

    const userEmailHtml = `
      <h2 style="color: #4f46e5;">Order Confirmation / অর্ডার নিশ্চিতকরণ</h2>
      <p>Hello ${orderData.userName}, / নমস্কার ${orderData.userName},</p>
      <p>Thank you for your order! We've received it and are now processing it.</p>
      <p>আপনার অর্ডারের জন্য ধন্যবাদ! আমরা এটি পেয়েছি এবং এখন প্রসেস করছি।</p>
      
      <div style="background: #f0fdf4; padding: 25px; border-radius: 16px; border: 1px solid #bbf7d0; margin: 30px 0;">
        <p style="margin: 0; font-weight: bold; color: #166534; font-size: 18px;">Order ID / অর্ডার আইডি: ${orderId}</p>
        <p style="margin: 10px 0 0 0; color: #166534; font-weight: 600;">Total Amount / মোট পরিমাণ: ₹${orderData.total}</p>
      </div>
      
      <p>We will notify you once your order has been shipped.</p>
      <p>আপনার অর্ডার পাঠানো হলে আমরা আপনাকে জানাব।</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>আপনার কোন প্রশ্ন থাকলে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।</p>
      <p>Best regards, / ইতি,<br><strong>Ruma Water Solutions Team</strong></p>
    `;

    // Send to admin
    await sendEmail("rumawatersolutions@gmail.com", `New Order: ${orderId} / নতুন অর্ডার: ${orderId}`, adminEmailHtml);
    
    // Send to user
    await sendEmail(orderData.userEmail, `Order Confirmation: ${orderId} / অর্ডার নিশ্চিতকরণ: ${orderId}`, userEmailHtml);

    res.json({ success: true });
  });

  // Registration Notification
  app.post("/api/notify-registration", async (req, res) => {
    const { name, email } = req.body;
    
    const emailHtml = `
      <h2 style="color: #4f46e5;">Welcome to Ruma Water Solutions! / স্বাগতম!</h2>
      <p>Hello ${name}, / নমস্কার ${name},</p>
      <p>Thank you for creating an account with us. We're excited to have you on board!</p>
      <p>আমাদের সাথে অ্যাকাউন্ট খোলার জন্য ধন্যবাদ। আমরা আপনাকে আমাদের সাথে পেয়ে আনন্দিত!</p>
      <p>You can now browse our products, place orders, and track your water solutions needs easily.</p>
      <p>আপনি এখন সহজেই আমাদের পণ্যগুলি দেখতে পারেন, অর্ডার দিতে পারেন এবং আপনার প্রয়োজনীয়তা ট্র্যাক করতে পারেন।</p>
      <div style="margin: 35px 0; text-align: center;">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="button">Start Shopping / কেনাকাটা শুরু করুন</a>
      </div>
      <p>If you have any questions, feel free to reply to this email.</p>
      <p>আপনার কোন প্রশ্ন থাকলে এই ইমেলের উত্তর দিতে পারেন।</p>
      <p>Best regards, / ইতি,<br><strong>Ruma Water Solutions Team</strong></p>
    `;

    await sendEmail(email, "Welcome to Ruma Water Solutions / স্বাগতম", emailHtml);
    res.json({ success: true });
  });

  // Login Notification (Bilingual)
  app.post("/api/notify-login", async (req, res) => {
    const { name, email, deviceInfo, loginTime } = req.body;
    safeLog(`Received login notification request for: ${email}`);
    
    const subject = "Login Alert for your Ruma Water Solutions Account / আপনার অ্যাকাউন্টে লগইন করা হয়েছে।";
    const emailHtml = `
      <h2 style="color: #4f46e5;">Login Notification / লগইন বিজ্ঞপ্তি</h2>
      <p>Hi ${name}, you just logged into your account on <strong>${deviceInfo}</strong> at <strong>${loginTime}</strong>. If this wasn't you, please reset your password.</p>
      <div class="bilingual-section">
        <p>প্রিয় ${name}, আপনি <strong>${deviceInfo}</strong>-তে <strong>${loginTime}</strong>-এ আপনার অ্যাকাউন্টে লগইন করেছেন। এটি আপনি না হলে, দয়া করে পাসওয়ার্ড পরিবর্তন করুন।</p>
      </div>
      <div style="margin: 35px 0; text-align: center;">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/profile" class="button">Manage Account / অ্যাকাউন্ট পরিচালনা করুন</a>
      </div>
    `;

    try {
      await sendEmail(email, subject, emailHtml);
      safeLog(`Login notification email sent to ${email}`);
      res.json({ success: true });
    } catch (error) {
      safeError(`Failed to send login notification email to ${email}:`, error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Order Status Notification
  app.post("/api/notify-order-status", authenticate, requireAdmin, async (req, res) => {
    const { orderId, status, userEmail, userName } = req.body;
    
    const emailHtml = `
      <h2 style="color: #4f46e5;">Order Status Update / অর্ডারের স্থিতি আপডেট</h2>
      <p>Hello ${userName}, / নমস্কার ${userName},</p>
      <p>Your order <strong>${orderId}</strong> status has been updated to: <span style="color: #4f46e5; font-weight: bold; text-transform: uppercase;">${status}</span></p>
      <p>আপনার অর্ডার <strong>${orderId}</strong>-এর স্থিতি আপডেট করা হয়েছে: <span style="color: #4f46e5; font-weight: bold; text-transform: uppercase;">${status}</span></p>
      
      <p>You can track your order in the "Order History" section of our app.</p>
      <p>আপনি আমাদের অ্যাপের "অর্ডার হিস্ট্রি" বিভাগে আপনার অর্ডার ট্র্যাক করতে পারেন।</p>
      
      <div style="margin: 35px 0; text-align: center;">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/order-history" class="button">View Order History / অর্ডার হিস্ট্রি দেখুন</a>
      </div>
      <p>If you have any questions, feel free to reply to this email.</p>
      <p>আপনার কোন প্রশ্ন থাকলে এই ইমেলের উত্তর দিতে পারেন।</p>
      <p>Best regards, / ইতি,<br><strong>Ruma Water Solutions Team</strong></p>
    `;

    await sendEmail(userEmail, `Order Status Update: ${orderId} / অর্ডারের স্থিতি আপডেট`, emailHtml);
    res.json({ success: true });
  });

  // Admin: Change Password
  app.put("/api/admin-password/change", authenticate, requireAdmin, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const db = readDb();
    
    if (db.settings.adminPassword === oldPassword) {
      db.settings.adminPassword = newPassword;
      writeDb(db);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Incorrect old password" });
    }
  });

  // Admin: Get Support Tickets
  app.get("/api/admin/tickets", authenticate, requireAdmin, (req, res) => {
    const db = readDb();
    res.json(db.tickets || []);
  });

  // Admin: Delete Support Ticket
  app.delete("/api/admin/tickets/:id", authenticate, requireAdmin, (req, res) => {
    const db = readDb();
    const ticketId = req.params.id;
    if (db.tickets) {
      db.tickets = db.tickets.filter((t) => t.id !== ticketId);
      writeDb(db);
      io.emit("tickets_updated", db.tickets);
    }
    res.json({ success: true });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- Socket.io ---
  io.on("connection", (socket) => {
    safeLog("Client connected:", socket.id);
    
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(userId);
        safeLog(`User ${userId} joined room`);
      }
    });

    socket.on("order_status_update", (data) => {
      // Broadcast to specific user
      if (data.userId) {
        io.to(data.userId).emit("notification", {
          title: "Order Update",
          message: `Your order ${data.orderId} is now ${data.status}`,
          type: "info"
        });
      }
    });

    socket.on("disconnect", () => {
      safeLog("Client disconnected:", socket.id);
    });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    safeError("Server Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: process.env.NODE_ENV === "production" ? "An unexpected error occurred." : err.message 
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    safeLog(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
