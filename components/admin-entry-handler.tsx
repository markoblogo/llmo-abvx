"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { AdminEntryChoiceModal } from "@/components/admin-entry-choice-modal";

const STORAGE_KEY = "adminEntryChoiceShownForUser";

export function AdminEntryHandler() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Не показываем модалку на любых admin-роутах
    if (pathname?.startsWith("/admin")) {
      setShowModal(false);
      return;
    }

    // Только для аутентифицированных пользователей
    if (status !== "authenticated" || !session?.user) {
      setShowModal(false);
      return;
    }

    const checkAdminRole = async () => {
      try {
        const response = await fetch("/api/user/role", {
          credentials: "include",
        });

        if (!response.ok) {
          setShowModal(false);
          return;
        }

        const data = await response.json();
        const isAdmin = data.isAdmin === true;
        if (!isAdmin) {
          setShowModal(false);
          return;
        }

        // Проверяем, показывали ли уже модалку для этого пользователя
        if (typeof window === "undefined") {
          setShowModal(false);
          return;
        }

        const userId = (session.user as any)?.id || session.user.email || "unknown";

        const stored = window.sessionStorage.getItem(STORAGE_KEY);

        if (stored === userId) {
          // Уже показывали модалку в этой сессии — не показываем снова
          setShowModal(false);
        } else {
          // Первый показ для этого пользователя в текущей сессии
          setShowModal(true);
        }
      } catch (error) {
        console.error("[AdminEntryHandler] Error checking admin role:", error);
        setShowModal(false);
      }
    };

    checkAdminRole();
  }, [session, status, pathname]);

  const rememberChoice = () => {
    if (typeof window === "undefined" || !session?.user) return;
    const userId = (session.user as any)?.id || session.user.email || "unknown";
    window.sessionStorage.setItem(STORAGE_KEY, userId);
  };

  const handleClose = () => {
    rememberChoice();
    setShowModal(false);
  };

  const handleSelectUser = () => {
    rememberChoice();
    setShowModal(false);
    router.push("/dashboard");
  };

  const handleSelectAdmin = () => {
    rememberChoice();
    setShowModal(false);
    router.push("/admin");
  };

  if (!showModal) return null;

  return (
    <AdminEntryChoiceModal
      open={showModal}
      onClose={handleClose}
      onSelectUser={handleSelectUser}
      onSelectAdmin={handleSelectAdmin}
    />
  );
}
