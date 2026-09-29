import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lotto Master - 데이터 기반 번호 예측",
  description: "단순 운이 아닌, 통계와 패턴으로 번호를 예측하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
