import Image from "next/image";
import bgImg from "@/public/halo.png";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ThemeToggle from "@/components/ThemeToggle";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <body className="bg-brand dark:bg-dark antialiased dark:text-gray-100">
      <div className="absolute inset-0 dark:bg-dark-radial" />
      <div className="absolute inset-x-0 flex justify-center">
        <Image
          src={bgImg}
          alt=""
          className="w-full max-w-[1200px] mix-blend-screen dark:mix-blend-plus-lighter dark:opacity-10"
          priority
        />
      </div>

      <div className="isolate relative">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center py-2">
          <div className="fixed right-4 top-4 z-50">
            <ThemeToggle />
          </div>
          <Header />
          {children}
          <Footer />
        </div>
      </div>
    </body>
  );
}
