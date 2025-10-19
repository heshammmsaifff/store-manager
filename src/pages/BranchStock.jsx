import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function BranchStock() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [transfers, setTransfers] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function fetchBranches() {
    const { data, error } = await supabase
      .from("warehouses")
      .select("id, name")
      .eq("type", "branch");
    if (error) console.error(error);
    else setBranches(data);
  }

  async function fetchTransfers() {
    const { data, error } = await supabase.from("branch_transfers").select(`
      id,
      weight_kg,
      created_at,
      notes,
      roasting_batches (
        roast_type,
        output_weight_kg,
        bean_type,
        green_bags (bag_code, bean_type)
      ),
      warehouses (id, name)
    `);

    if (error) console.error(error);
    else setTransfers(data || []);
  }

  useEffect(() => {
    fetchBranches();
    fetchTransfers();
  }, []);

  // فلترة التحويلات حسب الفرع والتاريخ
  const filteredTransfers = transfers.filter((t) => {
    const date = new Date(t.created_at);
    const branchMatch = !selectedBranch || t.warehouses?.id === selectedBranch;

    const fromMatch = !fromDate || date >= new Date(fromDate);
    const toMatch = !toDate || date <= new Date(toDate + "T23:59:59");

    return branchMatch && fromMatch && toMatch;
  });

  // ✅ تجميع البيانات حسب الفرع ونوع التحميص
  const aggregated = filteredTransfers.reduce((acc, t) => {
    const branchName = t.warehouses?.name || "غير محدد";
    const roastType =
      (t.notes && t.notes.split(" | ")[0]) ||
      t.roasting_batches?.roast_type ||
      "-";

    const key = `${branchName}-${roastType}`;
    if (!acc[key]) {
      acc[key] = { branchName, roastType, totalWeight: 0 };
    }
    acc[key].totalWeight += parseFloat(t.weight_kg || 0);
    return acc;
  }, {});

  const aggregatedList = Object.values(aggregated);

  // ✅ إجمالي عام
  const grandTotal = aggregatedList.reduce(
    (sum, item) => sum + item.totalWeight,
    0
  );

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">الفروع</h1>

      {/* 🔹 فلاتر البحث */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* اختيار الفرع */}
        <select
          className="border p-2 rounded w-full"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="">اختر الفرع</option>
          {branches.map((br) => (
            <option key={br.id} value={br.id}>
              {br.name}
            </option>
          ))}
        </select>

        {/* ✅ من تاريخ */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">من تاريخ</label>
          <input
            type="date"
            className="border p-2 rounded w-full"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        {/* ✅ إلى تاريخ */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">إلى تاريخ</label>
          <input
            type="date"
            className="border p-2 rounded w-full"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {/* 🔹 جدول التحويلات */}
      <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-100 mb-8">
        <table className="w-full min-w-[700px] text-sm text-gray-700">
          <thead className="bg-blue-600 text-white text-right">
            <tr>
              <th className="p-3 text-center">الفرع</th>
              <th className="p-3 text-center">نوع التحميص</th>
              <th className="p-3 text-center">الوزن (كجم)</th>
              <th className="p-3 text-center">تاريخ الإرسال</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransfers.length > 0 ? (
              filteredTransfers.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-t hover:bg-blue-50 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="p-3 text-center">
                    {t.warehouses?.name || "-"}
                  </td>
                  <td className="p-3 text-center">
                    {(t.notes && t.notes.split(" | ")[0]) ||
                      t.roasting_batches?.roast_type ||
                      "-"}
                  </td>
                  <td className="p-3 text-center">{t.weight_kg}</td>
                  <td className="p-3 text-center">
                    {new Date(t.created_at).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  لا توجد تحويلات متاحة حسب الفلتر الحالي
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ جدول التجميع */}
      <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-100">
        <h2 className="text-lg font-semibold text-blue-700 p-4">
          إجمالي الكميات حسب الفرع ونوع التحميص
        </h2>
        <table className="w-full min-w-[500px] text-sm text-gray-700">
          <thead className="bg-gray-200 text-gray-800 text-right">
            <tr>
              <th className="p-3 text-center">الفرع</th>
              <th className="p-3 text-center">نوع التحميص</th>
              <th className="p-3 text-center">الإجمالي (كجم)</th>
            </tr>
          </thead>
          <tbody>
            {aggregatedList.length > 0 ? (
              <>
                {aggregatedList.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-t ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="p-3 text-center">{row.branchName}</td>
                    <td className="p-3 text-center">{row.roastType}</td>
                    <td className="p-3 text-center font-semibold text-blue-600">
                      {row.totalWeight.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {/* ✅ إجمالي عام */}
                <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                  <td className="p-3 text-center" colSpan="2">
                    الإجمالي العام
                  </td>
                  <td className="p-3 text-center text-blue-800">
                    {grandTotal.toFixed(2)} كجم
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan="3" className="text-center py-6 text-gray-500">
                  لا توجد بيانات تجميعية
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
