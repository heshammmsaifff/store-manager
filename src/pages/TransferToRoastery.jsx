import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";

export default function TransferToRoastery() {
  const [bags, setBags] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [transferCounts, setTransferCounts] = useState({});
  const [loading, setLoading] = useState(false);

  // 📦 تحميل الشوالات اللي في المخزن الرئيسي
  async function fetchBags() {
    const { data, error } = await supabase
      .from("green_bags")
      .select("*")
      .eq("status", "in_main");

    if (error) {
      console.error(error);
      return;
    }

    setBags(data || []);

    // 🧮 تجميع حسب نوع البن
    const groupedData = data.reduce((acc, bag) => {
      const type = bag.bean_type || "غير محدد";
      if (!acc[type]) {
        acc[type] = { bean_type: type, count: 0, totalWeight: 0, ids: [] };
      }
      acc[type].count += 1;
      acc[type].totalWeight += bag.weight_kg || 0;
      acc[type].ids.push(bag.id);
      return acc;
    }, {});

    setGrouped(Object.values(groupedData));
  }

  useEffect(() => {
    fetchBags();
  }, []);

  // 🔁 نقل جزء من نوع معين إلى المحمصة
  async function handleTransfer(typeGroup) {
    const countToTransfer = parseInt(transferCounts[typeGroup.bean_type] || 0);
    if (countToTransfer <= 0) {
      Swal.fire({
        icon: "warning",
        title: "تنبيه ⚠️",
        text: "أدخل عدد الشوالات التي تريد نقلها.",
      });
      return;
    }

    if (countToTransfer > typeGroup.count) {
      Swal.fire({
        icon: "error",
        title: "خطأ ❌",
        text: "لا يمكنك نقل عدد أكبر من الموجود.",
      });
      return;
    }

    // ✅ رسالة تأكيد قبل النقل
    const confirm = await Swal.fire({
      title: "تأكيد النقل",
      html: `هل أنت متأكد من نقل <b>${countToTransfer}</b> شوال من نوع <b>${typeGroup.bean_type}</b> إلى المحمصة؟`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "نعم، انقلهم",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#6b7280",
    });

    if (!confirm.isConfirmed) return;

    const idsToTransfer = typeGroup.ids.slice(0, countToTransfer);

    setLoading(true);

    const { error } = await supabase
      .from("green_bags")
      .update({ status: "in_roastery" })
      .in("id", idsToTransfer);

    setLoading(false);

    if (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "حدث خطأ أثناء النقل ❌",
        text: error.message,
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "تم النقل بنجاح ✅",
        text: `تم نقل ${countToTransfer} شوال من نوع ${typeGroup.bean_type}.`,
        timer: 2500,
        showConfirmButton: false,
      });
      fetchBags();
    }
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-green-700 text-center sm:text-right">
        🔁 نقل البن الأخضر إلى المحمصة
      </h1>

      <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-100">
        <table className="w-full min-w-[700px] text-sm text-gray-700">
          <thead className="bg-green-600 text-white text-right">
            <tr>
              <th className="p-3 text-center">نوع البن</th>
              <th className="p-3 text-center">عدد الشوالات</th>
              <th className="p-3 text-center">إجمالي الوزن</th>
              <th className="p-3 text-center">عدد الشوالات للنقل</th>
              <th className="p-3 text-center">نقل</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length > 0 ? (
              grouped.map((g, i) => (
                <tr
                  key={g.bean_type}
                  className={`border-t hover:bg-green-50 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="p-3 text-center font-semibold text-green-700">
                    {g.bean_type}
                  </td>
                  <td className="p-3 text-center">{g.count}</td>
                  <td className="p-3 text-center">
                    {g.totalWeight.toFixed(2)} كجم
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="1"
                      max={g.count}
                      placeholder="0"
                      value={transferCounts[g.bean_type] || ""}
                      onChange={(e) =>
                        setTransferCounts({
                          ...transferCounts,
                          [g.bean_type]: e.target.value,
                        })
                      }
                      className="border rounded p-1 text-center w-20"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleTransfer(g)}
                      disabled={loading}
                      className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition"
                    >
                      {loading ? "..." : "نقل"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500">
                  لا توجد شوالات في المخزن الرئيسي حالياً
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
