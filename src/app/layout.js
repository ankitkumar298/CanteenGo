import "../index.css";
import "../App.css";
import "../mobile.css";
import { AppProvider } from "@/context/AppContext";

export const metadata = {
  title: "canteenGo — Smart College Canteen Ordering & Live Queue",
  description: "Contactless campus dining, digital tokens, live queue and smart canteen management",
  icons: {
    icon: [
      { url: "/images/canteengo-logo.png" },
      { url: "/favicon.ico" }
    ],
    shortcut: "/images/canteengo-logo.png",
    apple: "/images/canteengo-logo.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/canteengo-logo.png" type="image/png" />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
