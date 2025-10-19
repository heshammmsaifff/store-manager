import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";

// 🧩 دالة مساعده لتحويل بيانات المخرجات النصية أو JSON إلى قائمة جاهزة للعرض والنقل
function parseOutputDetails(batch) {
  const allTransfers = batch.branch_transfers || [];
  const batchTotalOutput = batch.output_weight_kg || 0;
  const beanType = batch.green_bags?.bean_type || batch.bean_type || "غير محدد";

  let itemIndex = 0;

  // 🧮 إنشاء كائن النتيجة مع حساب الكميات المنقولة والمتبقية
  const createOutputItem = (roastType, itemWeight) => {
    if (itemWeight <= 0) return null;

    // ✅ تنظيف نوع التحميص لإزالة الوزن أو الأقواس منه
    const cleanRoastType = roastType.replace(/\(.*?\)/g, "").trim();

    const normalizedRoastType = cleanRoastType
      .trim()
      .replace(/[^\w\s\u0600-\u06FF]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    const splitId = `${batch.id}-${normalizedRoastType}-${itemIndex++}`;

    // 🔄 حساب الكمية المنقولة لهذا النوع فقط
    const currentRoastTransferred = allTransfers.reduce((sum, t) => {
      if (t.notes && t.notes.startsWith(cleanRoastType)) {
        return sum + (parseFloat(t.weight_kg) || 0);
      }
      return sum;
    }, 0);

    const transferred = currentRoastTransferred;
    const available = itemWeight - transferred;

    if (available.toFixed(2) <= 0) return null;

    return {
      id: batch.id,
      split_id: splitId,
      bean_type: beanType,
      roast_type: cleanRoastType, // ✅ نعرض الاسم بعد التنظيف
      roast_date: batch.roast_date,
      total_output: itemWeight,
      total_transferred: transferred,
      total_available: available,
    };
  };

  // 🔹 في حالة وجود أنواع متعددة في نفس الدفعة
  if (batch.roast_type && batch.roast_type.includes(",")) {
    const outputItems = batch.roast_type.split(",").map((item) => item.trim());
    return outputItems
      .map((item) => {
        const match = item.match(/(.+?)\s*\(([\d.,]+)\s*كجم\)?/);
        const roastType = match ? match[1].trim() : item;
        const itemWeight = match ? parseFloat(match[2]) : 0;
        return createOutputItem(roastType, itemWeight);
      })
      .filter((r) => r !== null);
  }

  // 🔹 دفعات البيانات التجريبية (Mock Data)
  const isMultiOutputBatch = batchTotalOutput === 100 && !batch.roast_type;
  if (isMultiOutputBatch) {
    const mockOutputData = [
      { roast_type: "حبشي وسط", weight_kg: 20.0 },
      { roast_type: "كولومبي وسط", weight_kg: 20.0 },
      { roast_type: "برازيلي سانتوس وسط", weight_kg: 20.0 },
      { roast_type: "يمني وسط", weight_kg: 20.0 },
      { roast_type: "سلطان فاتح", weight_kg: 20.0 },
    ];

    return mockOutputData
      .map((roast) => createOutputItem(roast.roast_type, roast.weight_kg))
      .filter((r) => r !== null);
  }

  // 🔹 دفعات ناتج واحد
  if (batchTotalOutput > 0) {
    return [
      createOutputItem(batch.roast_type || "غير محدد", batchTotalOutput),
    ].filter((r) => r !== null);
  }

  return [];
}

export default function BranchTransfers() {
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    bean_key: "",
    branch_id: "",
    weight_kg: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    const { data: batchesData, error: batchErr } = await supabase
      .from("roasting_batches")
      .select(
        `
        id, output_weight_kg, roast_type, roast_date, bean_type,
        green_bags(bean_type),
        branch_transfers(weight_kg, notes)
      `
      )
      .order("roast_date", { ascending: false });

    const { data: branchesData, error: branchErr } = await supabase
      .from("warehouses")
      .select("id, name")
      .eq("type", "branch");

    if (batchErr) console.error(batchErr);
    if (branchErr) console.error(branchErr);

    const readyBatches = (batchesData || [])
      .flatMap((b) => parseOutputDetails(b))
      .sort((a, b) => new Date(b.roast_date) - new Date(a.roast_date));

    setBatches(readyBatches);
    setBranches(branchesData || []);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleTransfer(e) {
    e.preventDefault();

    const batchKey = form.bean_key;
    if (!batchKey) {
      Swal.fire("⚠️", "الرجاء اختيار نوع البن المحمص للنقل أولاً", "warning");
      return;
    }

    const selectedBatch = batches.find((b) => b.split_id === batchKey);
    if (!selectedBatch) {
      Swal.fire("⚠️", "حدث خطأ في تحديد نوع البن", "warning");
      return;
    }

    const transferAmount = parseFloat(form.weight_kg);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Swal.fire("⚠️", "أدخل كمية صالحة للنقل", "warning");
      return;
    }

    if (transferAmount > selectedBatch.total_available) {
      Swal.fire(
        "❌",
        `لا يمكن نقل ${transferAmount} كجم — المتاح من ${
          selectedBatch.roast_type
        } فقط ${selectedBatch.total_available.toFixed(2)} كجم`,
        "error"
      );
      return;
    }

    const branch = branches.find((b) => b.id == form.branch_id);
    if (!branch) {
      Swal.fire("⚠️", "اختر الفرع أولاً", "warning");
      return;
    }

    const confirm = await Swal.fire({
      title: "تأكيد النقل",
      html: `
        <p class="text-right">نوع التحميص: <b>${selectedBatch.roast_type}</b></p>
        <p class="text-right">الكمية للنقل: <b>${transferAmount} كجم</b></p>
        <p class="text-right">إلى فرع: <b>${branch.name}</b></p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "نعم، نقل الآن",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);

    const { error } = await supabase.from("branch_transfers").insert([
      {
        roasting_batch_id: selectedBatch.id,
        branch_id: form.branch_id,
        weight_kg: transferAmount,
        notes: `${selectedBatch.roast_type} | ${form.notes}`,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      Swal.fire("❌", `حدث خطأ أثناء عملية النقل: ${error.message}`, "error");
    } else {
      Swal.fire("✅", "تم نقل البن إلى الفرع بنجاح", "success");
      setForm({
        bean_key: "",
        branch_id: "",
        weight_kg: "",
        notes: "",
      });
      fetchData();
    }
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-6 text-blue-700 border-b pb-2">
        🚚 نقل البن المحمص إلى الفروع
      </h1>

      {/* 🧾 نموذج النقل */}
      <form
        onSubmit={handleTransfer}
        className="bg-white p-6 rounded-xl shadow-lg mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            اختر نوع البن المحمص
          </label>
          <select
            className="border p-2.5 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
            value={form.bean_key}
            onChange={(e) => setForm({ ...form, bean_key: e.target.value })}
            required
          >
            <option value="">-- اختر نوع البن المحمص للنقل --</option>
            {batches.map((b) => (
              <option key={b.split_id} value={b.split_id}>
                {b.roast_type} — الناتج {b.total_output.toFixed(2)} كجم — متاح{" "}
                {b.total_available.toFixed(2)} كجم (تحميص:{" "}
                {new Date(b.roast_date).toLocaleDateString("ar-EG")})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            اختر الفرع
          </label>
          <select
            className="border p-2.5 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
            value={form.branch_id}
            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
            required
          >
            <option value="">-- اختر الفرع --</option>
            {branches.map((br) => (
              <option key={br.id} value={br.id}>
                {br.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الكمية (كجم)
          </label>
          <input
            type="number"
            placeholder="الكمية (كجم)"
            className="border p-2.5 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <input
          type="text"
          placeholder="ملاحظات (اختياري)"
          className="border p-2.5 rounded-lg md:col-span-3 focus:ring-blue-500 focus:border-blue-500"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-md md:col-span-1"
        >
          {loading ? "جارٍ النقل..." : "نقل البن إلى الفرع"}
        </button>
      </form>

      {/* 📊 جدول الأرصدة */}
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        جدول الأرصدة المتاحة للنقل
      </h2>
      <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100">
        <table className="w-full text-sm text-gray-700 table-auto">
          <thead className="bg-blue-600 text-white sticky top-0">
            <tr>
              <th className="p-4 text-center whitespace-nowrap">
                نوع التحميص الناتج
              </th>
              <th className="p-4 text-center whitespace-nowrap">
                وزن الناتج (كجم)
              </th>
              <th className="p-4 text-center whitespace-nowrap">
                الكمية المنقولة (كجم)
              </th>
              <th className="p-4 text-center whitespace-nowrap">
                المتبقي للنقل (كجم)
              </th>
              <th className="p-4 text-center whitespace-nowrap">
                تاريخ التحميص
              </th>
            </tr>
          </thead>
          <tbody>
            {batches.length > 0 ? (
              batches.map((b, i) => (
                <tr
                  key={b.split_id}
                  className={`border-t border-gray-200 ${
                    i % 2 === 0 ? "bg-white" : "bg-blue-50"
                  } hover:bg-blue-100 transition-colors`}
                >
                  <td className="p-3 text-center font-medium">
                    {b.roast_type}
                  </td>
                  <td className="p-3 text-center font-semibold text-gray-800">
                    {b.total_output.toFixed(2)}
                  </td>
                  <td className="p-3 text-center text-gray-500">
                    {b.total_transferred.toFixed(2)}
                  </td>
                  <td className="p-3 text-center text-green-600 font-extrabold">
                    {b.total_available.toFixed(2)}
                  </td>
                  <td className="p-3 text-center text-gray-600 whitespace-nowrap">
                    {new Date(b.roast_date).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500">
                  لا توجد دفعات محمصة متاحة للنقل حاليًا.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
