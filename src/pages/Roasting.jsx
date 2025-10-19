import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";

// ===============================================
// NEW MODAL COMPONENT FOR DETAILS (نافذة التفاصيل)
// ===============================================

function RoastingDetailModal({ batch, onClose }) {
  if (!batch) return null;

  // Function to split and parse the combined strings
  const parseCombinedData = (dataString) => {
    if (!dataString) return [];
    const regex = /([^,]+)\s*\(([\d.]+)\s*كجم\)/g;
    const results = [];
    let match;
    while ((match = regex.exec(dataString)) !== null) {
      results.push({
        type: match[1].trim(), // e.g., "حبشي"
        weight: parseFloat(match[2]), // e.g., 10.00
      });
    }
    return results;
  };

  const inputBeansList = batch.bean_type
    ? parseCombinedData(batch.bean_type)
    : [];
  const outputRoastsList = batch.roast_type
    ? parseCombinedData(batch.roast_type)
    : [];

  const totalInputWeight = batch.input_weight_kg || 0;
  const totalOutputWeight = outputRoastsList.reduce(
    (sum, r) => sum + r.weight,
    0
  );

  const reprocessedWeight = batch.reprocessed_weight_kg || 0;
  const netOutput = totalOutputWeight + reprocessedWeight;
  const waste = totalInputWeight - netOutput;

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose} // 💡 تم حل مشكلة الإغلاق بالضغط على المساحة الفارغة
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto p-6 transition-all transform scale-100 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4 border-b pb-3">
          <h3 className="text-xl font-bold text-orange-700">
            تفاصيل عملية التحميص (
            {new Date(batch.created_at).toLocaleDateString("ar-EG")})
          </h3>
          <button
            onClick={onClose} // 💡 تم حل مشكلة الإغلاق بالضغط على زر X
            className="text-gray-500 hover:text-gray-900 text-3xl leading-none font-semibold"
            aria-label="إغلاق"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4 text-gray-700 max-h-[70vh] overflow-y-auto pr-2">
          {/* Summary Section */}
          <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
            <p className="font-bold text-lg mb-2 text-orange-700">
              ملخص الأوزان
            </p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <span className="font-bold">البن الأخضر الداخل:</span>
              <span className="font-bold text-green-700">
                {totalInputWeight.toFixed(2)} كجم
              </span>
              <span className="font-bold">البن المحمص الناتج:</span>
              <span className="font-bold text-orange-700">
                {totalOutputWeight.toFixed(2)} كجم
              </span>
              {reprocessedWeight > 0 && (
                <>
                  <span className="font-bold text-blue-600">
                    التوليف المُعاد:
                  </span>
                  <span className="font-bold text-blue-600">
                    {reprocessedWeight.toFixed(2)} كجم
                  </span>
                </>
              )}
              <span
                className={`font-bold border-t pt-2 mt-2 ${
                  waste > 0.5 ? "text-red-600" : "text-gray-700"
                }`}
              >
                الهادر الإجمالي:
              </span>
              <span
                className={`font-extrabold border-t pt-2 mt-2 ${
                  waste > 0.5 ? "text-red-600" : "text-gray-800"
                }`}
              >
                {waste.toFixed(2)} كجم
              </span>
            </div>
          </div>

          {/* Input Beans Details */}
          <div>
            <p className="font-semibold text-base mb-2 text-green-700 border-b pb-1">
              البن الأخضر الداخل:
            </p>
            <ul className="space-y-1 text-sm">
              {inputBeansList.map((bean, index) => (
                <li
                  key={index}
                  className="flex justify-between p-2 bg-green-50 rounded"
                >
                  <span className="font-medium">{bean.type}</span>
                  <span className="text-green-800 font-bold">
                    {bean.weight.toFixed(2)} كجم
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Output Roasts Details */}
          <div>
            <p className="font-semibold text-base mb-2 text-orange-700 border-b pb-1">
              البن المحمص الناتج:
            </p>
            <ul className="space-y-1 text-sm">
              {outputRoastsList.map((roast, index) => (
                <li
                  key={index}
                  className="flex justify-between p-2 bg-orange-50 rounded"
                >
                  <span className="font-medium">{roast.type}</span>
                  <span className="text-orange-800 font-bold">
                    {roast.weight.toFixed(2)} كجم
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Notes */}
          {batch.notes && (
            <div>
              <p className="font-semibold text-base mb-1">ملاحظات العملية:</p>
              <p className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap">
                {batch.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===============================================
// MAIN COMPONENT (Roasting)
// ===============================================
export default function Roasting() {
  const [bags, setBags] = useState([]);
  const [inputBeans, setInputBeans] = useState([{ bean_type: "", weight: "" }]);
  const [outputRoasts, setOutputRoasts] = useState([
    { roast_type: "", weight: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [reprocessStatus, setReprocessStatus] = useState("no"); // 'yes' or 'no'
  const [reprocessWeight, setReprocessWeight] = useState(""); // Kilograms
  const [totals, setTotals] = useState({ green: 0, roasted: 0, waste: 0 });
  const [roastingHistory, setRoastingHistory] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [editingBatch, setEditingBatch] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [detailBatch, setDetailBatch] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const roastOptions = [
    "شرقي فاتح",
    "شرقي وسط",
    "شرقي غامق",
    "عميد فاتح",
    "عميد وسط",
    "عميد غامق",
    "سلطان فاتح",
    "سلطان وسط",
    "سلطان غامق",
    "السلطان اكسترا فاتح",
    "كولومبي وسط",
    "كولومبي غامق",
    "برازيلي سانتوس وسط",
    "حبشي وسط",
    "يمني وسط",
  ];

  async function fetchBags() {
    const { data, error } = await supabase
      .from("green_bags")
      .select("bean_type, weight_kg, id") // Added 'id' to get counts of bags
      .eq("status", "in_roastery");
    if (error) return console.error(error);

    const grouped = Object.values(
      data.reduce((acc, bag) => {
        if (!acc[bag.bean_type])
          acc[bag.bean_type] = {
            bean_type: bag.bean_type,
            totalWeight: 0,
            count: 0,
          };
        acc[bag.bean_type].totalWeight += parseFloat(bag.weight_kg) || 0;
        acc[bag.bean_type].count += 1;
        return acc;
      }, {})
    );
    setBags(grouped);
  }

  async function fetchRoastingHistory(startDate = null, endDate = null) {
    let query = supabase
      .from("roasting_batches")
      .select(
        "id, created_at, bean_type, roast_type, input_weight_kg, output_weight_kg, notes, reprocessed_weight_kg"
      )
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate + "T23:59:59");

    const { data, error } = await query;
    if (error) {
      console.error(error);
      return;
    }

    const combinedEntries = data.filter(
      (r) =>
        (r.bean_type && r.bean_type.includes(")")) ||
        (r.roast_type && r.roast_type.includes(")"))
    );

    setRoastingHistory(combinedEntries);
  }

  useEffect(() => {
    fetchBags();
    fetchRoastingHistory();
  }, []);

  useEffect(() => {
    const totalGreen = inputBeans.reduce(
      (sum, b) => sum + Number(b.weight || 0),
      0
    );
    const totalRoasted = outputRoasts.reduce(
      (sum, r) => sum + Number(r.weight || 0),
      0
    );
    const netOutput =
      totalRoasted +
      (reprocessStatus === "yes" ? Number(reprocessWeight || 0) : 0);
    const waste = totalGreen - netOutput;
    setTotals({ green: totalGreen, roasted: totalRoasted, waste });
  }, [inputBeans, outputRoasts, reprocessStatus, reprocessWeight]);

  function addInputBean() {
    setInputBeans([...inputBeans, { bean_type: "", weight: "" }]);
  }
  function removeInputBean(index) {
    setInputBeans(inputBeans.filter((_, i) => i !== index));
  }
  function addOutputRoast() {
    setOutputRoasts([...outputRoasts, { roast_type: "", weight: "" }]);
  }
  function removeOutputRoast(index) {
    setOutputRoasts(outputRoasts.filter((_, i) => i !== index));
  }

  // 💡 تم تعديل دالة فتح المودال
  function openDetailModal(batch) {
    setDetailBatch(batch);
    setShowDetailModal(true);
  }

  // دالة الإغلاق البسيطة التي يحتاجها المودال
  function closeDetailModal() {
    setShowDetailModal(false);
    setDetailBatch(null);
  }

  // فتح Modal التعديل (Keeping the previous implementation as the primary focus is on saving/displaying)
  function openEditModal(batch) {
    Swal.fire({
      title: "أدخل كلمة السر للتعديل",
      input: "password",
      inputPlaceholder: "كلمة السر",
      showCancelButton: true,
    }).then((result) => {
      if (!result.isConfirmed) return;
      const password = result.value;
      if (password !== process.env.REACT_APP_EDIT_PASSWORD) {
        Swal.fire("خطأ", "كلمة السر غير صحيحة", "error");
        return;
      }
      setEditingBatch(batch);
      setShowModal(true);
    });
  }

  async function handleUpdate() {
    if (!editingBatch) return;

    try {
      Swal.fire("تم التعديل ✅");
      fetchRoastingHistory();
      setShowModal(false);
    } catch (e) {
      Swal.fire("خطأ ❌", "حدث خطأ أثناء الحفظ", "error");
      console.error(e);
    }
  }

  async function handleRoast() {
    if (inputBeans.some((b) => !b.bean_type || !b.weight))
      return Swal.fire("⚠️ خطأ", "أكمل بيانات البن الأخضر.", "warning");

    if (outputRoasts.some((r) => !r.roast_type || !r.weight))
      return Swal.fire("⚠️ خطأ", "أكمل بيانات البن المحمص.", "warning");

    if (
      reprocessStatus === "yes" &&
      (!reprocessWeight || Number(reprocessWeight) <= 0)
    )
      return Swal.fire("⚠️ خطأ", "أدخل قيمة صحيحة لوزن التوليف.", "warning");

    const netOutput =
      totals.roasted +
      (reprocessStatus === "yes" ? Number(reprocessWeight || 0) : 0);

    if (netOutput > totals.green)
      return Swal.fire(
        "⚠️ كمية غير صحيحة",
        "لا يمكن أن يكون إجمالي الناتج المحمص والتوليف أكبر من البن الأخضر.",
        "error"
      );

    const reprocessInfo =
      reprocessStatus === "yes"
        ? `<br/><b>كمية التوليف (إعادة استخدام):</b> ${Number(
            reprocessWeight
          ).toFixed(2)} كجم`
        : "";

    const confirm = await Swal.fire({
      title: "تأكيد العملية",
      html: `
        <b>إجمالي البن الأخضر الداخل:</b> ${totals.green.toFixed(2)} كجم<br/>
        <b>إجمالي البن المحمص الناتج:</b> ${totals.roasted.toFixed(2)} كجم
        ${reprocessInfo}
        <hr class="my-2"/>
        <b>الهادر الإجمالي:</b> ${totals.waste.toFixed(2)} كجم
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "نعم، تأكيد",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#ea580c",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      // 1. Create a single database entry for the entire batch
      const { error: insertError } = await supabase
        .from("roasting_batches")
        .insert([
          {
            bean_type: inputBeans
              .map((b) => `${b.bean_type} (${Number(b.weight).toFixed(2)} كجم)`)
              .join(", "),
            input_weight_kg: totals.green,
            output_weight_kg: totals.roasted,
            roast_type: outputRoasts
              .map(
                (r) => `${r.roast_type} (${Number(r.weight).toFixed(2)} كجم)`
              )
              .join(", "),
            notes: notes,
            reprocessed_weight_kg:
              reprocessStatus === "yes" ? Number(reprocessWeight) : 0,
          },
        ]);

      if (insertError) throw insertError;

      // 2. خصم البن الأخضر من الشوالات (Deduction logic)
      for (const input of inputBeans) {
        let remainingToDeduct = parseFloat(input.weight);
        const { data: existingBags } = await supabase
          .from("green_bags")
          .select("id, weight_kg")
          .eq("bean_type", input.bean_type)
          .eq("status", "in_roastery")
          .order("created_at", { ascending: true });

        for (const bag of existingBags) {
          if (remainingToDeduct <= 0) break;
          const deduction = Math.min(
            parseFloat(bag.weight_kg),
            remainingToDeduct
          );
          const { error: deductionError } = await supabase
            .from("green_bags")
            .update({
              weight_kg: parseFloat(bag.weight_kg) - deduction,
              status:
                parseFloat(bag.weight_kg) - deduction === 0
                  ? "used"
                  : "in_roastery",
            })
            .eq("id", bag.id);

          if (deductionError) throw deductionError; // Handle deduction error

          remainingToDeduct -= deduction;
        }
      }

      // 3. إضافة كمية التوليف إلى رصيد البن الأخضر
      if (reprocessStatus === "yes" && Number(reprocessWeight) > 0) {
        const bagCode = `REPROCESS-${Date.now()}`;
        const reprocessedBeanType = "بن مُعاد تدويره (توليف)";

        const { error: greenBagError } = await supabase
          .from("green_bags")
          .insert([
            {
              bean_type: reprocessedBeanType,
              weight_kg: Number(reprocessWeight),
              status: "in_roastery",
              notes: `تمت إضافته من عملية تحميص بتاريخ ${new Date().toLocaleDateString(
                "ar-EG"
              )} - (رمز: ${bagCode})`,
              bag_code: bagCode,
              initial_weight: Number(reprocessWeight),
            },
          ]);

        if (greenBagError) throw greenBagError; // Handle insertion error
      }

      Swal.fire({
        icon: "success",
        title: "✅ تم تسجيل العملية بنجاح",
        showConfirmButton: false,
        timer: 2000,
      });
      setInputBeans([{ bean_type: "", weight: "" }]);
      setOutputRoasts([{ roast_type: "", weight: "" }]);
      setNotes("");
      setReprocessStatus("no");
      setReprocessWeight("");
      fetchBags();
      fetchRoastingHistory();
    } catch (e) {
      Swal.fire(
        "❌ خطأ",
        "حدث خطأ أثناء العملية، راجع تفاصيل الخطأ في الكونسول.",
        "error"
      );
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-green-700">
        عملية تحميص متعددة الأنواع
      </h1>

      {/* جدول رصيد البن الأخضر (مع البن المعاد تدويره/التوليف) */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="font-bold text-xl mb-3 text-green-700">
          رصيد البن الأخضر الحالي في المحمصة
        </h2>
        {bags.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-separate border-spacing-0 rounded-lg overflow-hidden">
              <thead className="bg-green-600 text-white sticky top-0">
                <tr>
                  <th className="p-3 text-center whitespace-nowrap">
                    نوع البن
                  </th>
                  <th className="p-3 text-center whitespace-nowrap">
                    الكمية المتاحة (كجم)
                  </th>
                  <th className="p-3 text-center whitespace-nowrap">
                    عدد الشوالات
                  </th>
                </tr>
              </thead>
              <tbody>
                {bags.map((bag, i) => (
                  <tr
                    key={i}
                    className="border-t text-center even:bg-green-50 hover:bg-green-100 transition"
                  >
                    <td className="p-3">
                      {bag.bean_type}
                      {bag.bean_type === "بن مُعاد تدويره (توليف)" && (
                        <span className="text-blue-500 font-bold text-xs mr-2">
                          (توليف)
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold">
                      {bag.totalWeight.toFixed(2)}
                    </td>
                    <td className="p-3">{bag.count}</td>
                  </tr>
                ))}
                <tr className="bg-green-200 font-extrabold border-t text-center">
                  <td className="p-3">الإجمالي</td>
                  <td className="p-3">
                    {bags.reduce((sum, b) => sum + b.totalWeight, 0).toFixed(2)}
                  </td>
                  <td className="p-3">
                    {bags.reduce((sum, b) => sum + b.count, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 p-4">
            لا يوجد بن أخضر حاليًا في المحمصة.
          </p>
        )}
      </div>

      {/* جدول البن الأخضر الداخل */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="font-bold text-xl mb-2 text-green-700">
          أنواع البن الأخضر الداخلة
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="p-2 text-center">نوع البن</th>
                <th className="p-2 text-center">الوزن (كجم)</th>
                <th className="p-2 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {inputBeans.map((b, i) => (
                <tr key={i} className="border-t even:bg-green-50">
                  <td className="p-2 text-center">
                    <select
                      value={b.bean_type}
                      onChange={(e) => {
                        const updated = [...inputBeans];
                        updated[i].bean_type = e.target.value;
                        setInputBeans(updated);
                      }}
                      className="border p-2 rounded w-full focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">اختر نوع البن</option>
                      {bags.map((bag) => (
                        <option key={bag.bean_type} value={bag.bean_type}>
                          {bag.bean_type} (متاح {bag.totalWeight.toFixed(2)}
                          كجم)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      value={b.weight}
                      onChange={(e) => {
                        const updated = [...inputBeans];
                        updated[i].weight = e.target.value;
                        setInputBeans(updated);
                      }}
                      className="border p-2 rounded w-full text-center focus:ring-green-500 focus:border-green-500"
                      placeholder="الوزن"
                      min="0.01"
                      step="0.01"
                    />
                  </td>
                  <td className="p-2 text-center">
                    {inputBeans.length > 1 && (
                      <button
                        onClick={() => removeInputBean(i)}
                        className="text-red-600 p-2 hover:bg-red-100 rounded transition"
                      >
                        ❌
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addInputBean}
          className="mt-4 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition font-medium"
        >
          + إضافة نوع بن
        </button>
      </div>

      {/* جدول البن المحمص الناتج */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="font-bold text-xl mb-2 text-orange-700">
          أنواع البن المحمص الناتجة
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-orange-600 text-white">
              <tr>
                <th className="p-2 text-center">نوع التحميص</th>
                <th className="p-2 text-center">الوزن (كجم)</th>
                <th className="p-2 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {outputRoasts.map((r, i) => (
                <tr key={i} className="border-t even:bg-orange-50">
                  <td className="p-2 text-center">
                    <select
                      value={r.roast_type}
                      onChange={(e) => {
                        const updated = [...outputRoasts];
                        updated[i].roast_type = e.target.value;
                        setOutputRoasts(updated);
                      }}
                      className="border p-2 rounded w-full focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">اختر نوع التحميص</option>
                      {roastOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      value={r.weight}
                      onChange={(e) => {
                        const updated = [...outputRoasts];
                        updated[i].weight = e.target.value;
                        setOutputRoasts(updated);
                      }}
                      className="border p-2 rounded w-full text-center focus:ring-orange-500 focus:border-orange-500"
                      placeholder="الوزن"
                      min="0.01"
                      step="0.01"
                    />
                  </td>
                  <td className="p-2 text-center">
                    {outputRoasts.length > 1 && (
                      <button
                        onClick={() => removeOutputRoast(i)}
                        className="text-red-600 p-2 hover:bg-red-100 rounded transition"
                      >
                        ❌
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addOutputRoast}
          className="mt-4 bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 transition font-medium"
        >
          + إضافة نوع تحميص
        </button>
      </div>

      {/* NEW SECTION: Reprocess/Recycle Question (التوليف) */}
      <div className="bg-gray-50 p-4 rounded-xl shadow mb-6">
        <h2 className="font-bold text-xl mb-3 text-blue-700">
          هل يوجد توليف (بن مُعاد تدويره)؟
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
            <input
              type="radio"
              name="reprocess_status"
              value="yes"
              checked={reprocessStatus === "yes"}
              onChange={() => setReprocessStatus("yes")}
              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="text-gray-900 font-medium">نعم</span>
          </label>
          <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
            <input
              type="radio"
              name="reprocess_status"
              value="no"
              checked={reprocessStatus === "no"}
              onChange={() => {
                setReprocessStatus("no");
                setReprocessWeight(""); // Clear weight if 'no' is selected
              }}
              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="text-gray-900 font-medium">لا</span>
          </label>
        </div>

        {reprocessStatus === "yes" && (
          <div className="mt-4 p-4 bg-blue-100 rounded-lg">
            <label
              htmlFor="reprocessWeight"
              className="block text-sm font-bold text-blue-700 mb-2"
            >
              قيمة التوليف (كجم):
            </label>
            <input
              id="reprocessWeight"
              type="number"
              value={reprocessWeight}
              onChange={(e) => setReprocessWeight(e.target.value)}
              className="border p-2 rounded w-full max-w-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="أدخل الوزن بالكيلوجرام"
              min="0.01"
              step="0.01"
            />
            <p className="text-xs text-blue-600 mt-2">
              ⚠️ هذه الكمية ستُضاف إلى رصيد البن الأخضر (بن مُعاد تدويره).
            </p>
          </div>
        )}
      </div>

      {/* الإجماليات */}
      <div className="bg-gray-100 p-4 rounded-xl shadow-lg mb-6 text-lg font-bold grid grid-cols-2 sm:grid-cols-4 gap-4">
        <span className="text-green-700">
          الإجمالي الداخل: {totals.green.toFixed(2)} كجم
        </span>
        <span className="text-orange-700">
          الناتج المحمص: {totals.roasted.toFixed(2)} كجم
        </span>
        {reprocessStatus === "yes" && (
          <span className="text-blue-700">
            التوليف: {Number(reprocessWeight || 0).toFixed(2)} كجم
          </span>
        )}
        <span className="text-gray-800 col-span-2 sm:col-span-1">
          الهادر:
          <span className={totals.waste < 0 ? "text-red-600" : "text-gray-800"}>
            {" "}
            {totals.waste.toFixed(2)} كجم
          </span>
        </span>
      </div>

      {/* ملاحظات + زر تسجيل */}
      <textarea
        placeholder="ملاحظات (اختياري)"
        className="border p-3 rounded-lg w-full mb-4 focus:ring-orange-500 focus:border-orange-500"
        rows="3"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        onClick={handleRoast}
        disabled={loading}
        className={`w-full py-3 px-6 rounded-lg font-bold text-lg transition ${
          loading
            ? "bg-orange-400 cursor-not-allowed"
            : "bg-orange-600 text-white hover:bg-orange-700 shadow-md"
        }`}
      >
        {loading ? "جارٍ التسجيل..." : "تسجيل عملية التحميص"}
      </button>

      {/* سجل عمليات التحميص */}
      <div className="bg-white p-4 rounded-xl shadow mt-8">
        <h2 className="font-bold text-xl mb-4 text-orange-700">
          سجل عمليات التحميص (عرض التفاصيل بالنقر)
        </h2>

        {/* فلاتر التاريخ */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border p-2 rounded-lg w-full sm:w-1/3 focus:ring-orange-500 focus:border-orange-500"
            placeholder="من تاريخ"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border p-2 rounded-lg w-full sm:w-1/3 focus:ring-orange-500 focus:border-orange-500"
            placeholder="إلى تاريخ"
          />
          <button
            onClick={() => fetchRoastingHistory(fromDate, toDate)}
            className="bg-orange-100 text-orange-700 py-2 px-4 rounded-lg hover:bg-orange-200 transition font-medium"
          >
            تطبيق الفلتر
          </button>
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
              fetchRoastingHistory();
            }}
            className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            مسح الفلتر
          </button>
        </div>

        {roastingHistory.length > 0 ? (
          <div className="overflow-x-auto border rounded-lg shadow-sm">
            {/* 💡 تحسين الاستجابة وشكل الجدول */}
            <table className="table-auto w-full text-sm">
              <thead className="bg-orange-600 text-white">
                <tr>
                  <th className="p-3 w-1/12 whitespace-nowrap">التاريخ</th>
                  <th className="p-3 w-2/12">المدخلات (نوع)</th>
                  <th className="p-3 w-2/12">المخرجات (نوع)</th>
                  <th className="p-3 w-2/12 whitespace-nowrap">الداخل (كجم)</th>
                  <th className="p-3 w-2/12 whitespace-nowrap">الناتج (كجم)</th>
                  <th className="p-3 w-1/12 whitespace-nowrap">الهادر (كجم)</th>
                  <th className="p-3 w-1/12 whitespace-nowrap">
                    التوليف (كجم)
                  </th>
                  <th className="p-3 w-1/12 whitespace-nowrap">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {roastingHistory.map((batch, index) => {
                  const inputWeight = Number(batch.input_weight_kg) || 0;
                  const outputWeight = Number(batch.output_weight_kg) || 0;
                  const reprocessedWeight =
                    Number(batch.reprocessed_weight_kg) || 0;
                  const waste =
                    inputWeight - (outputWeight + reprocessedWeight);

                  return (
                    <tr
                      key={batch.id}
                      className="border-t text-center even:bg-orange-50 hover:bg-orange-100 transition cursor-pointer"
                      onClick={() => openDetailModal(batch)}
                    >
                      <td className="p-3 whitespace-nowrap">
                        {new Date(batch.created_at).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-3 text-gray-700 text-xs">
                        {batch.bean_type.split(", ")[0]}
                        {batch.bean_type.split(", ").length > 1
                          ? ` (+${batch.bean_type.split(", ").length - 1})`
                          : ""}
                      </td>
                      <td className="p-3 text-gray-700 text-xs">
                        {batch.roast_type.split(", ")[0]}
                        {batch.roast_type.split(", ").length > 1
                          ? ` (+${batch.roast_type.split(", ").length - 1})`
                          : ""}
                      </td>
                      <td className="p-3 font-semibold text-green-700">
                        {inputWeight.toFixed(2)}
                      </td>
                      <td className="p-3 font-semibold text-orange-700">
                        {outputWeight.toFixed(2)}
                      </td>
                      <td
                        className={`p-3 font-bold ${
                          waste > 0.5 ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {waste.toFixed(2)}
                      </td>
                      <td className="p-3 text-blue-600 font-bold">
                        {reprocessedWeight.toFixed(2)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-orange-600 font-medium hover:underline">
                          تفاصيل
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 p-4 border rounded-lg">
            لا توجد عمليات تحميص مسجلة في هذه الفترة.
          </p>
        )}
      </div>

      {/* Modal for Details (Now using the closeDetailModal function) */}
      {showDetailModal && (
        <RoastingDetailModal batch={detailBatch} onClose={closeDetailModal} />
      )}
    </main>
  );
}
