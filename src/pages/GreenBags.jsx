import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FaPlus } from "react-icons/fa";
import Swal from "sweetalert2";

// 💡 دالة مساعدة لتوليد جزء فريد من الـ timestamp
const generateUniqueSuffix = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, ""); // HHmmss
  const msPart = now.getMilliseconds().toString().padStart(3, "0");
  return `${datePart}_${timePart}_${msPart}`;
};

export default function GreenBags() {
  const [bags, setBags] = useState([]);
  const [form, setForm] = useState({
    bag_code: "",
    weight_kg: "",
    bean_type: "",
    notes: "",
    count: "",
  });
  const [loading, setLoading] = useState(false);
  const [mainWarehouseId, setMainWarehouseId] = useState(null);
  const [totalBags, setTotalBags] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);

  const beanTypes = [
    { name: "اندونيسي", code: "IND", defaultWeight: 60 },
    { name: "اندونيسي XL", code: "INDXL", defaultWeight: 60 },
    { name: "فتنامي", code: "VIE", defaultWeight: 60 },
    { name: "هندي روبستا", code: "INR", defaultWeight: 60 },
    { name: "هندي أربيكا", code: "INA", defaultWeight: 60 },
    { name: "برازيلي ريو", code: "BRR", defaultWeight: 60 },
    { name: "برازيلي سانتوس", code: "BRS", defaultWeight: 60 },
    { name: "حبشي", code: "ETH", defaultWeight: 60 },
    { name: "يمني", code: "YEM", defaultWeight: 25 },
    { name: "كولومبي 35", code: "COL35", defaultWeight: 35 },
    { name: "كولومبي 70", code: "COL70", defaultWeight: 70 },
    { name: "حبهان كرتونة", code: "HAB-K", defaultWeight: 5 },
  ];

  // 🏠 جلب المخزن الرئيسي
  useEffect(() => {
    async function getMainWarehouse() {
      const { data } = await supabase
        .from("warehouses")
        .select("id")
        .eq("type", "main")
        .single();
      if (data) setMainWarehouseId(data.id);
    }
    getMainWarehouse();
  }, []);

  // 📦 تحميل البيانات وتجميعها يدوياً
  async function fetchAggregatedBags() {
    const { data, error } = await supabase
      .from("green_bags_summary") // استخدم الـ view بدل الجدول
      .select("*")
      .order("total_weight", { ascending: false }); // ترتيب حسب الوزن الكلي

    if (error) {
      console.error("SUPABASE FETCH ERROR:", error);
      setBags([]);
      setTotalBags(0);
      setTotalWeight(0);
      return;
    }

    setBags(data || []);

    // تحديث الإجمالي
    const totalB = data?.reduce((sum, b) => sum + parseInt(b.count), 0) || 0;
    const totalW =
      data?.reduce((sum, b) => sum + parseFloat(b.total_weight), 0) || 0;
    setTotalBags(totalB);
    setTotalWeight(totalW);
  }

  useEffect(() => {
    fetchAggregatedBags();
  }, []);

  // 🔁 عند اختيار نوع البن
  function handleBeanTypeChange(e) {
    const selected = beanTypes.find((b) => b.name === e.target.value);
    if (selected) {
      setForm({
        ...form,
        bean_type: selected.name,
        bag_code: selected.code,
        weight_kg: selected.defaultWeight,
      });
    } else {
      setForm({ ...form, bean_type: e.target.value });
    }
  }

  // ➕ إضافة الشوالات
  async function handleAdd(e) {
    e.preventDefault();
    if (!mainWarehouseId) {
      Swal.fire({
        icon: "error",
        title: "❌ لا يوجد مخزن رئيسي",
        text: "لم يتم تحديد المخزن الرئيسي بعد.",
      });
      return;
    }

    const count = parseInt(form.count || 1);
    const weight = parseFloat(form.weight_kg);

    if (count <= 0 || weight <= 0) {
      Swal.fire({
        icon: "warning",
        title: "⚠️ تحقق من البيانات",
        text: "تأكد من إدخال عدد ووزن صحيحين.",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "تأكيد الإضافة",
      html: `هل تريد إضافة <b>${count}</b> شوال 
        من نوع <b>${form.bean_type || "غير محدد"}</b>
        بوزن <b>${weight} كجم</b> لكل شوال؟`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "نعم، أضفهم ✅",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
    });

    if (!confirm.isConfirmed) return;

    const allBags = Array.from({ length: count }, () => ({
      bag_code: `${form.bag_code}_${crypto.randomUUID()}`,
      weight_kg: weight,
      bean_type: form.bean_type,
      notes: form.notes,
      warehouse_id: mainWarehouseId,
      status: "in_main",
    }));

    const chunkSize = 500;
    const chunks = [];
    for (let i = 0; i < allBags.length; i += chunkSize) {
      chunks.push(allBags.slice(i, i + chunkSize));
    }

    setLoading(true);
    for (const chunk of chunks) {
      const { error } = await supabase.from("green_bags").insert(chunk);
      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        Swal.fire({
          icon: "error",
          title: "❌ خطأ أثناء الحفظ",
          text: "حدث خطأ أثناء إضافة بعض الشوالات.",
        });
        setLoading(false);
        return;
      }
    }
    setLoading(false);

    Swal.fire({
      icon: "success",
      title: "تمت الإضافة بنجاح ✅",
      text: `تمت إضافة ${count} شوال بنجاح.`,
      timer: 2500,
      showConfirmButton: false,
    });

    setForm({
      bag_code: "",
      weight_kg: "",
      bean_type: "",
      notes: "",
      count: "",
    });
    fetchAggregatedBags();
  }

  return (
    <main className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-6 text-green-700 text-center sm:text-right">
        🏠 البن الأخضر في المخزن الرئيسي
      </h1>

      <div className="bg-green-50 p-4 rounded-xl shadow mb-6 flex flex-col sm:flex-row justify-between text-center gap-3">
        <div className="font-semibold text-green-700">
          🧺 إجمالي عدد الشوالات:{" "}
          <span className="font-bold text-lg">{totalBags}</span>
        </div>
        <div className="font-semibold text-green-700">
          ⚖️ إجمالي الوزن:{" "}
          <span className="font-bold text-lg">
            {totalWeight.toFixed(2)} كجم
          </span>
        </div>
        <div className="font-semibold text-green-700">
          ⚖️ الوزن بالطن:{" "}
          <span className="font-bold text-lg">
            {(totalWeight / 1000).toFixed(2)} طن
          </span>
        </div>
      </div>

      <form
        onSubmit={handleAdd}
        className="bg-white p-4 rounded-xl shadow mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <select
          className="border p-2 rounded w-full"
          value={form.bean_type}
          onChange={handleBeanTypeChange}
          required
        >
          <option value="">اختر نوع البن الأخضر</option>
          {beanTypes.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="الكود الأساسي"
          className="border p-2 rounded w-full bg-gray-100"
          value={form.bag_code}
          readOnly
        />

        <input
          type="number"
          placeholder="عدد الشوالات"
          className="border p-2 rounded w-full"
          value={form.count || ""}
          onChange={(e) => setForm({ ...form, count: e.target.value })}
        />

        <input
          type="number"
          placeholder="الوزن لكل شوال (كجم)"
          className="border p-2 rounded w-full bg-gray-100"
          value={form.weight_kg}
          readOnly
        />

        <textarea
          placeholder="ملاحظات (اختياري)"
          className="border p-2 rounded sm:col-span-2"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white py-2 rounded sm:col-span-2 flex items-center justify-center gap-2 hover:bg-green-700 transition"
        >
          <FaPlus /> {loading ? "جارٍ الحفظ..." : "إضافة الشوالات"}
        </button>
      </form>

      <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-100">
        {bags.length === 0 ? (
          <p className="text-center py-6 text-gray-500">
            لا توجد شوالات مسجلة في الوقت الحالي
          </p>
        ) : (
          <table className="w-full text-sm text-gray-700 min-w-[600px]">
            <thead className="bg-green-600 text-white text-right">
              <tr>
                <th className="p-3 text-center">النوع</th>
                <th className="p-3 text-center">عدد الشوالات</th>
                <th className="p-3 text-center">إجمالي الوزن</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {bags.map((g, i) => (
                <tr
                  key={g.bean_type}
                  className={`border-t hover:bg-green-50 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="p-3 text-center font-semibold text-green-700">
                    {g.bean_type}
                  </td>
                  <td className="p-3 text-center">{g.count}</td>
                  <td className="p-3 text-center">
                    {g.total_weight.toFixed(2)} كجم
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                      في المخزن الرئيسي
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
