"use client"; // เปลี่ยนเป็น Client Component เพื่อให้ใช้ hooks ได้

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "./contexts/store";
import { ThemeEnum } from "@/interfaces/enums";

import localFont from "next/font/local";
import "./globals.css"; // CSS หลักยังคงอยู่
import Navbar from "./components/navbar";
import ReduxProvider from "./contexts/redux_provider";

// --- Font Configuration (เหมือนเดิม) ---
const ibmPlexSansThai = localFont({
  variable: "--font-ibm-plex-sans-thai",
  src: [{ path: "./fonts/IBMPlexSansThai-Regular.ttf", weight: "400", style: "normal" }],
});

// --- Component ใหม่สำหรับจัดการ Theme โดยเฉพาะ ---
function ThemedApp({ children }: { children: React.ReactNode }) {
  const theme = useSelector((state: RootState) => state.theme.mode);

  useEffect(() => {
    // Logic นี้จะทำงานทุกครั้งที่ theme เปลี่ยน และส่งผลต่อทุกหน้า
    if (theme === ThemeEnum.DARK) {
      document.body.style.backgroundColor = "#212529"; // สีพื้นหลังหลัก
      document.documentElement.setAttribute('data-bs-theme', 'dark'); // บอก Bootstrap ให้ใช้ Dark Theme
    } else {
      document.body.style.backgroundColor = "#f8f9fa"; // สีพื้นหลังหลัก
      document.documentElement.setAttribute('data-bs-theme', 'light'); // บอก Bootstrap ให้ใช้ Light Theme
    }
  }, [theme]);

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

// --- Root Layout หลัก ---
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={ibmPlexSansThai.variable}>
        <ReduxProvider>
          <ThemedApp>{children}</ThemedApp>
        </ReduxProvider>
      </body>
    </html>
  );
}

