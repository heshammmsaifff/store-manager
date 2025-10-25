import React, { useState, useEffect } from "react";
import { Lock, Unlock, Menu, X } from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "./lib/supabase";

import GreenBags from "./pages/GreenBags";
import TransferToRoastery from "./pages/TransferToRoastery";
import Roasting from "./pages/Roasting";
import BranchTransfers from "./pages/BranchTransfers";
import BranchStock from "./pages/BranchStock";

export default function App() {
  const [activePage, setActivePage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [storedPassword, setStoredPassword] = useState(null);
  const [loading, setLoading] = useState(true);

  const pages = [
    { key: "green", label: "🏠 البن الأخضر", protected: true },
    { key: "transfer", label: "🚛 نقل للمحمصة", protected: true },
    { key: "roast", label: "🔥 التحميص" },
    { key: "branches", label: "🏪 توزيع الفروع" },
    { key: "branchStock", label: "📦 الفروع" },
  ];

  // ✅ تحميل الباسوورد من Supabase عند فتح الصفحة
  useEffect(() => {
    async function fetchPassword() {
      const { data, error } = await supabase
        .from("custom_pass")
        .select("password")
        .single();

      if (error) {
        console.error("خطأ في جلب كلمة المرور:", error);
        Swal.fire({
          icon: "error",
          title: "حدث خطأ أثناء تحميل كلمة المرور",
          text: "من فضلك تحقق من الاتصال بـ Supabase",
        });
      } else {
        setStoredPassword(data.password);
      }
      setLoading(false);
    }

    fetchPassword();
  }, []);

  // ✅ نافذة إدخال الباسوورد
  const askForPassword = async (pageKey) => {
    const { value: password } = await Swal.fire({
      title: "🔐 كلمة المرور مطلوبة",
      input: "password",
      inputPlaceholder: "أدخل كلمة المرور",
      confirmButtonText: "تأكيد",
      cancelButtonText: "إلغاء",
      showCancelButton: true,
      confirmButtonColor: "#166534",
      cancelButtonColor: "#9ca3af",
      background: "#fff",
      customClass: {
        popup: "rounded-xl shadow-lg",
      },
    });

    if (!password) return;

    if (password === storedPassword) {
      setIsUnlocked(true);
      setActivePage(pageKey);
      Swal.fire({
        icon: "success",
        title: "تم تسجيل الدخول بنجاح ✅",
        showConfirmButton: false,
        timer: 1500,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "❌ كلمة المرور غير صحيحة",
        text: "من فضلك حاول مرة أخرى.",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const handlePageClick = (page) => {
    if (page.protected && !isUnlocked) {
      askForPassword(page.key);
    } else {
      setActivePage(page.key);
      setMenuOpen(false);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "green":
        return <GreenBags />;
      case "transfer":
        return <TransferToRoastery />;
      case "roast":
        return <Roasting />;
      case "branches":
        return <BranchTransfers />;
      case "branchStock":
        return <BranchStock />;
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            <h1 className="text-2xl font-bold text-green-700 mb-6">
              👋 مرحبًا بك في نظام إدارة المخزن والمحمصة
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
              {pages.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePageClick(p)}
                  className="p-4 bg-green-700 hover:bg-green-800 text-white rounded-xl shadow text-lg flex items-center justify-center gap-2 transition"
                >
                  {p.label}
                  {p.protected && <Lock size={18} />}
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg text-green-700">
        جارِ تحميل البيانات...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar
        pages={pages}
        activePage={activePage}
        onPageClick={handlePageClick}
        isUnlocked={isUnlocked}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onHomeClick={() => setActivePage("")}
      />
      <main className="flex-1">{renderPage()}</main>
    </div>
  );
}

/* ✅ مكون Navbar */
function Navbar({
  pages,
  activePage,
  onPageClick,
  isUnlocked,
  menuOpen,
  setMenuOpen,
  onHomeClick,
}) {
  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold cursor-pointer" onClick={onHomeClick}>
          إدارة المخزن و المحمصة
        </h1>

        <button
          className="md:hidden p-2 rounded hover:bg-green-800"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="hidden md:flex items-center gap-4">
          {pages.map((p) => (
            <button
              key={p.key}
              onClick={() => onPageClick(p)}
              className={`px-3 py-2 rounded-md transition flex items-center gap-1 ${
                activePage === p.key
                  ? "bg-white text-green-700 font-semibold"
                  : "hover:bg-green-800"
              }`}
            >
              {p.label}
              {p.protected &&
                (isUnlocked ? (
                  <Unlock size={16} />
                ) : (
                  <Lock size={16} className="opacity-70" />
                ))}
            </button>
          ))}
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-green-800 px-4 py-2 space-y-2">
          {pages.map((p) => (
            <button
              key={p.key}
              onClick={() => onPageClick(p)}
              className={`block w-full text-right px-3 py-2 rounded-md transition ${
                activePage === p.key
                  ? "bg-white text-green-700 font-semibold"
                  : "hover:bg-green-700"
              }`}
            >
              {p.label}{" "}
              {p.protected &&
                (isUnlocked ? (
                  <Unlock size={14} className="inline" />
                ) : (
                  <Lock size={14} className="inline opacity-70" />
                ))}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
