import React, { useState, useEffect, useMemo, useRef } from "react";
import { API_BASE_URL } from "../../services/api";

// --- Komponen Ikon ---
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);
const CloseIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
const ZoomInIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
    />
  </svg>
);
const ZoomOutIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
    />
  </svg>
);
const ResetZoomIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5"
    />
  </svg>
);
const AiIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);
const SaveIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>
);
const EditIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);
const AddIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);
const MergeIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    />
  </svg>
);
const MoreIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
  </svg>
);
const TrashIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

// --- FUNGSI PARSING MARKDOWN ---
const parseMultiTableMarkdown = (markdown) => {
  if (!markdown || typeof markdown !== "string") return [];

  const lines = markdown.split("\n");
  const contentBlocks = [];
  let currentTextLines = [];
  let currentTableLines = [];

  const flushText = () => {
    if (currentTextLines.length > 0) {
      contentBlocks.push({
        type: "text",
        content: currentTextLines.join("\n"),
      });
      currentTextLines = [];
    }
  };

  const flushTable = () => {
    if (currentTableLines.length > 0) {
      const parseRow = (rowStr) => rowStr.split("|").slice(1, -1).map((cell) => cell.trim());
      
      if (currentTableLines.length >= 2 && currentTableLines[1].includes("---")) {
        const headers = parseRow(currentTableLines[0]);
        const rows = currentTableLines.slice(2).map(parseRow);
        contentBlocks.push({ type: "table", data: { headers, rows } });
      } else {
        // Jika struktur tabel tidak valid, anggap sebagai teks biasa
        currentTextLines.push(...currentTableLines);
      }
      currentTableLines = [];
    }
  };

  lines.forEach((line) => {
    const isTableLine = line.trim().startsWith("|") && line.trim().endsWith("|");
    
    if (isTableLine) {
      flushText(); // Simpan blok teks sebelumnya jika ada
      currentTableLines.push(line);
    } else {
      flushTable(); // Simpan blok tabel sebelumnya jika ada
      currentTextLines.push(line);
    }
  });

  flushText(); // Pastikan sisa teks terakhir disimpan
  flushTable(); // Pastikan sisa tabel terakhir disimpan

  return contentBlocks;
};

// --- FUNGSI KONVERSI KE MARKDOWN ---
const convertContentBlocksToMarkdown = (blocks) => {
  return blocks.map(block => {
    if (block.type === 'text') {
      return block.content;
    }
    if (block.type === 'table') {
      const { headers, rows } = block.data;
      const headerRow = `| ${headers.join(" | ")} |`;
      const separatorRow = `|${headers.map(() => "---").join("|")}|`;
      const dataRows = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
      return `${headerRow}\n${separatorRow}\n${dataRows}`;
    }
    return '';
  }).join('\n\n'); // Beri jarak antar blok
};

// --- HOOK UNTUK DROPDOWN ---
const useDropdown = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const ref = useRef(null);

  const handleClickOutside = (event) => {
    if (ref.current && !ref.current.contains(event.target)) {
      setOpenDropdown(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return { openDropdown, setOpenDropdown, ref };
};

// --- KOMPONEN EDITOR MODAL UNTUK EDIT TEKS PANJANG ---
const TextEditorModal = ({ isOpen, onClose, value, onChange, title }) => {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(editValue);
    onClose();
  };

  const handleCancel = () => {
    setEditValue(value);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 p-6">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full h-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none"
            placeholder="Edit teks di sini..."
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN EDITOR TABEL YANG LEBIH POWERFUL (REFACTORED) ---
const AdvancedTableEditor = ({ headers, rows, onTableChange }) => {
  const [selectedCells, setSelectedCells] = useState([]);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [textEditorData, setTextEditorData] = useState({
    value: "",
    type: "",
    index: null,
  });
  const { openDropdown, setOpenDropdown, ref } = useDropdown();

  const openTextEditor = (value, type, rowIndex, colIndex) => {
    setTextEditorData({
      value,
      type,
      rowIndex,
      colIndex,
      title: type === "header" ? "Edit Header" : "Edit Sel Tabel",
    });
    setIsTextEditorOpen(true);
  };

  const handleTextEditorSave = (newValue) => {
    const newHeaders = [...headers];
    const newRows = rows.map((row) => [...row]);
    if (textEditorData.type === "header") {
      newHeaders[textEditorData.colIndex] = newValue;
    } else {
      newRows[textEditorData.rowIndex][textEditorData.colIndex] = newValue;
    }
    onTableChange(newHeaders, newRows);
    setIsTextEditorOpen(false);
  };

  const addColumn = (index) => {
    const newHeaders = [...headers];
    const newRows = rows.map((row) => [...row]);
    const insertIndex = index + 1;
    newHeaders.splice(insertIndex, 0, `Kolom Baru`);
    newRows.forEach((row) => row.splice(insertIndex, 0, ""));
    onTableChange(newHeaders, newRows);
    setOpenDropdown(null);
  };

  const deleteColumn = (index) => {
    if (headers.length <= 1) return;
    const newHeaders = headers.filter((_, i) => i !== index);
    const newRows = rows.map((row) => row.filter((_, i) => i !== index));
    onTableChange(newHeaders, newRows);
    setOpenDropdown(null);
  };

  const addRow = (index) => {
    const newRows = [...rows];
    const newRow = headers.map(() => "");
    newRows.splice(index + 1, 0, newRow);
    onTableChange(headers, newRows);
    setOpenDropdown(null);
  };

  const deleteRow = (index) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    onTableChange(headers, newRows);
    setOpenDropdown(null);
  };

  const mergeCells = () => {
    if (selectedCells.length < 2) return;

    // Pastikan semua sel yang dipilih berada di baris yang sama (baik header atau data)
    const firstRowIndex = selectedCells[0].rowIndex;
    if (!selectedCells.every((cell) => cell.rowIndex === firstRowIndex)) {
      alert("Hanya bisa merge sel pada baris yang sama.");
      return;
    }

    const newHeaders = [...headers];
    const newRows = rows.map((row) => [...row]);

    const sortedCells = [...selectedCells].sort(
      (a, b) => a.colIndex - b.colIndex
    );
    const firstCell = sortedCells[0];
    const lastCell = sortedCells[sortedCells.length - 1];

    // Cek apakah merge dilakukan di header (rowIndex = -1)
    if (firstCell.rowIndex === -1) {
      // --- STEP 1: Gabungkan teks header ---
      const mergedHeaderText = sortedCells
        .map((cell) => headers[cell.colIndex])
        .join(" / ");

      // --- STEP 2: Gabungkan konten untuk SETIAP BARIS DATA ---
      newRows.forEach((row) => {
        // Ambil semua konten dari kolom yang akan di-merge untuk baris ini
        const contentToMerge = [];
        for (let i = firstCell.colIndex; i <= lastCell.colIndex; i++) {
          contentToMerge.push(row[i] || ""); // Gunakan || '' untuk sel kosong
        }
        // Gabungkan konten dan masukkan ke kolom pertama
        row[firstCell.colIndex] = contentToMerge.join(" / ");
      });

      // --- STEP 3: Hapus kolom-kolom yang sudah digabung (dari kanan ke kiri) ---
      for (let i = lastCell.colIndex; i > firstCell.colIndex; i--) {
        newHeaders.splice(i, 1);
        newRows.forEach((row) => {
          row.splice(i, 1);
        });
      }

      // Update header pertama dengan teks yang sudah digabung
      newHeaders[firstCell.colIndex] = mergedHeaderText;
    } else {
      // Logika untuk merge sel di baris data (bukan header)
      const rowIndex = firstCell.rowIndex;
      const targetRow = newRows[rowIndex];

      const contentToMerge = [];
      for (let i = firstCell.colIndex; i <= lastCell.colIndex; i++) {
        contentToMerge.push(targetRow[i] || "");
      }

      // Gabungkan dan masukkan ke sel pertama
      targetRow[firstCell.colIndex] = contentToMerge.join(" / ");

      // Hapus sel-sel lain yang sudah digabung
      for (let i = lastCell.colIndex; i > firstCell.colIndex; i--) {
        targetRow.splice(i, 1);
      }
    }

    onTableChange(newHeaders, newRows);
    setSelectedCells([]);
  };

  const toggleCellSelection = (rowIndex, colIndex) => {
    setSelectedCells((prev) => {
      const exists = prev.find(
        (cell) => cell.rowIndex === rowIndex && cell.colIndex === colIndex
      );

      if (exists) {
        return prev.filter(
          (cell) => !(cell.rowIndex === rowIndex && cell.colIndex === colIndex)
        );
      } else {
        return [...prev, { rowIndex, colIndex }];
      }
    });
  };

  const isCellSelected = (rowIndex, colIndex) => {
    return selectedCells.some(
      (cell) => cell.rowIndex === rowIndex && cell.colIndex === colIndex
    );
  };

  const ToolbarButton = ({ onClick, disabled, children, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
    >
      {children}
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      <TextEditorModal
        isOpen={isTextEditorOpen}
        onClose={() => setIsTextEditorOpen(false)}
        value={textEditorData.value}
        onChange={handleTextEditorSave}
        title={textEditorData.title}
      />

      {/* Toolbar Baru yang Lebih Rapi */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <ToolbarButton
            onClick={() => addColumn(headers.length - 1)}
            title="Tambah Kolom di Akhir"
          >
            <div className="flex items-center gap-2 text-sm px-2">
              <AddIcon /> Kolom
            </div>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => addRow(rows.length - 1)}
            title="Tambah Baris di Akhir"
          >
            <div className="flex items-center gap-2 text-sm px-2">
              <AddIcon /> Baris
            </div>
          </ToolbarButton>
        </div>
        <div className="flex items-center gap-2">
          <ToolbarButton
            onClick={mergeCells}
            disabled={selectedCells.length < 2}
            title="Gabungkan Sel (Merge)"
          >
            <MergeIcon />
          </ToolbarButton>
        </div>
        <div className="text-sm text-gray-500 flex-grow text-right">
          {selectedCells.length > 0
            ? `${selectedCells.length} sel terpilih`
            : "Tips: Gunakan Ctrl+Klik untuk memilih banyak sel"}
        </div>
      </div>

      {/* Tabel Editor */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100/70 backdrop-blur-sm">
            <tr>
              <th className="p-2 border-b border-r border-gray-200 sticky top-0 left-0 z-20 bg-gray-200 w-12 shadow-sm">
                #
              </th>
              {headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className="p-0 border-b border-r border-gray-200 sticky top-0 z-10 bg-gray-100 min-w-[150px] group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex-1 p-3 text-left font-semibold cursor-pointer hover:bg-blue-50 ${
                        isCellSelected(-1, colIndex)
                          ? "bg-blue-200 ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.ctrlKey
                          ? toggleCellSelection(-1, colIndex)
                          : openTextEditor(header, "header", -1, colIndex);
                      }}
                    >
                      <span className="line-clamp-2">{header}</span>
                    </div>
                    <div className="relative p-2">
                      <button
                        onClick={() => setOpenDropdown(`col-${colIndex}`)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-800"
                      >
                        <MoreIcon />
                      </button>
                      {openDropdown === `col-${colIndex}` && (
                        <div
                          ref={ref}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-30 border"
                        >
                          <a
                            onClick={() => addColumn(colIndex)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          >
                            <AddIcon /> Sisipkan Kolom
                          </a>
                          <a
                            onClick={() => deleteColumn(colIndex)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <TrashIcon /> Hapus Kolom
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group hover:bg-gray-50/50">
                <td className="p-0 border-b border-r border-gray-200 text-center sticky left-0 z-10 bg-white group-hover:bg-gray-50 w-12 shadow-sm">
                  <div className="flex items-center justify-center h-full relative">
                    <span className="text-gray-400 font-mono">
                      {rowIndex + 1}
                    </span>
                    <div className="absolute right-1">
                      <button
                        onClick={() => setOpenDropdown(`row-${rowIndex}`)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-800 p-1 rounded-full"
                      >
                        <MoreIcon />
                      </button>
                      {openDropdown === `row-${rowIndex}` && (
                        <div
                          ref={ref}
                          className="absolute left-full ml-2 -mt-4 w-48 bg-white rounded-md shadow-lg z-30 border"
                        >
                          <a
                            onClick={() => addRow(rowIndex)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          >
                            <AddIcon /> Sisipkan Baris
                          </a>
                          <a
                            onClick={() => deleteRow(rowIndex)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <TrashIcon /> Hapus Baris
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={`border-b border-r border-gray-200 ${
                      isCellSelected(rowIndex, colIndex) ? "bg-blue-100" : ""
                    }`}
                  >
                    <div
                      className={`p-3 min-h-[40px] cursor-pointer hover:bg-blue-50 ${
                        isCellSelected(rowIndex, colIndex)
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.ctrlKey
                          ? toggleCellSelection(rowIndex, colIndex)
                          : openTextEditor(cell, "cell", rowIndex, colIndex);
                      }}
                    >
                      <span className="line-clamp-3 text-sm">{cell}</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- KOMPONEN PRATINJAU GAMBAR DENGAN ZOOM & DRAG ---
const ImagePreviewWithZoom = ({ imagePath, pageNumber }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

const getFullImagePath = (path) => {
    if (!path) return '';

    // Jika path sudah merupakan URL lengkap, gunakan langsung.
    if (path.startsWith('http')) {
      return path;
    }

    // Jika path sudah diawali dengan /api, kita hanya butuh origin dari API_BASE_URL.
    if (path.startsWith('/api')) {
      try {
        const url = new URL(API_BASE_URL);
        // Menggabungkan origin (http://host:port) dengan path yang sudah ada.
        return `${url.origin}${path}`;
      } catch (e) {
        // Fallback jika API_BASE_URL tidak valid
        return path;
      }
    }
    
    // Jika path tidak memiliki prefix, gabungkan dengan API_BASE_URL lengkap.
    return `${API_BASE_URL}${path}`;
  };

  const fullImagePath = useMemo(() => getFullImagePath(imagePath), [imagePath]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(4, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.3, prev - 0.2));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const imageRect = imageRef.current.getBoundingClientRect();
      
      // Perhitungan batas yang lebih akurat
        const maxX = Math.max(0, (imageRect.width - containerRect.width) / 2);
      const maxY = Math.max(0, (imageRect.height - containerRect.height) / 2);
      
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

 const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(0.3, Math.min(4, prev + delta)));
    } else {
      if (zoomLevel > 1) {
         // Logika scroll untuk pan (opsional, bisa di-uncomment jika diinginkan)
        // setPosition(prev => ({
        //   x: prev.x - e.deltaX * 0.5,
        //   y: prev.y - e.deltaY * 0.5
        // }));
      }
    }
  };

  useEffect(() => {
    if (zoomLevel <= 1) { // Reset jika zoom kembali ke 1 atau kurang
      setPosition({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <label className="font-semibold text-gray-700 text-lg">
          Pratinjau Gambar
        </label>
        <div className="flex items-center gap-2 bg-gray-100 border rounded-lg p-2">
          {/* ... tombol zoom tidak berubah ... */}
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 hover:bg-gray-200 rounded-md"
          >
            <ZoomOutIcon />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset Zoom"
            className="p-2 hover:bg-gray-200 rounded-md"
          >
            <ResetZoomIcon />
          </button>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 hover:bg-gray-200 rounded-md"
          >
            <ZoomInIcon />
          </button>
          <span className="text-sm font-semibold text-gray-600 w-12 text-center">
            {(zoomLevel * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="border-2 border-gray-200 rounded-lg bg-gray-50 flex-1 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none' // Tambahan: Mencegah teks/gambar terseleksi saat drag
        }}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <img
            ref={imageRef}
            src={fullImagePath}
            alt={`Pratinjau Halaman ${pageNumber}`}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
             style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              maxWidth: '100%', 
              maxHeight: '100%',
            }}
          />
        </div>
        
        {zoomLevel > 1 && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Klik dan tahan untuk menggeser • Scroll untuk menggeser • Ctrl+Scroll untuk zoom
          </div>
        )}
      </div>
    </div>
  );
};

// --- KOMPONEN MODAL UTAMA ---
export default function ReconstructionModal({
  chunkData,
  onClose,
  onSave,
  onReconstruct,
  isReconstructing,
  isSaving,
  isLoading,
}) {
  const [editedContent, setEditedContent] = useState("");
  const [activeTab, setActiveTab] = useState("editor");
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const isTable = useMemo(() => chunkData?.type === 'table', [chunkData]);

  useEffect(() => {
    if (chunkData) {
      setEditedContent(
        chunkData.reconstructed_content || chunkData.chunk_content || ""
      );
      setActiveTab("editor");
    }
  }, [chunkData]);
  

  // --- PERUBAHAN: Gunakan parser baru ---
  const contentBlocks = useMemo(() => {
    return parseMultiTableMarkdown(editedContent);
  }, [editedContent]);

  // --- PERUBAHAN: Handler untuk mengubah tabel tertentu berdasarkan index-nya ---
  const handleTableChange = (tableIndex, newHeaders, newRows) => {
    const newBlocks = JSON.parse(JSON.stringify(contentBlocks)); // Deep copy
    newBlocks[tableIndex].data = { headers: newHeaders, rows: newRows };
    const newMarkdown = convertContentBlocksToMarkdown(newBlocks);
    setEditedContent(newMarkdown);
  };

  // --- BARU: Handler untuk mengubah blok teks berdasarkan index-nya ---
  // const handleTextChange = (textIndex, newText) => {
  //   const newBlocks = JSON.parse(JSON.stringify(contentBlocks)); // Deep copy
  //   newBlocks[textIndex].content = newText;
  //   const newMarkdown = convertContentBlocksToMarkdown(newBlocks);
  //   setEditedContent(newMarkdown);
  // };

  const ExpandIcon = () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4"
      />
    </svg>
  );
  const CollapseIcon = () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 4H4v4m12 0h4V4M8 20H4v-4m12 0h4v-4"
      />
    </svg>
  );

  if (!chunkData && !isLoading) return null;

  const TabButton = ({ isActive, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
        isActive
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">
            {isLoading
              ? "Memuat Data..."
              : `Rekonstruksi Tabel - Halaman ${chunkData?.page_number}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
          >
            <CloseIcon />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
              {isTable && (
                <div
                  className={`
                    ${
                      isEditorExpanded
                        ? "hidden"
                        : "lg:w-2/5 flex flex-col h-1/2 lg:h-full"
                    }
                    transition-all duration-300
                  `}
                >
                  <ImagePreviewWithZoom 
                    imagePath={chunkData.image_path}
                    pageNumber={chunkData.page_number}
                  />
                </div>
              )}

              {/* Kolom Kanan: Tampilan Tab (bisa expand) */}
              <div
                className={`
                  ${
                    !isTable // Jika BUKAN table (alias text)
                      ? "w-full" // Selalu full width
                      : (isEditorExpanded ? "w-full" : "lg:w-3/5") // Logic lama jika table
                  }
                  flex flex-col h-1/2 lg:h-full transition-all duration-300
                `}
              >
                <div className="flex-shrink-0 flex justify-between items-center border-b border-gray-200">
                  <div className="flex">
                    <TabButton
                      isActive={activeTab === "original"}
                      onClick={() => setActiveTab("original")}
                    >
                      Teks Asli
                    </TabButton>
                    <TabButton
                      isActive={activeTab === "editor"}
                      onClick={() => setActiveTab("editor")}
                    >
                      <div className="flex items-center gap-2">
                        <EditIcon />
                      {isTable ? "Editor Tabel" : "Editor Teks"}
                      </div>
                    </TabButton>
                    <TabButton
                      isActive={activeTab === "preview"}
                      onClick={() => setActiveTab("preview")}
                    >
                      Pratinjau
                    </TabButton>
                    <TabButton
                      isActive={activeTab === "raw"}
                      onClick={() => setActiveTab("raw")}
                    >
                      Raw Markdown
                    </TabButton>
                  </div>
                  {isTable && (
                    <button
                      onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                      title={
                        isEditorExpanded
                          ? "Tampilkan Pratinjau Gambar"
                          : "Perbesar Editor"
                      }
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                    >
                      {isEditorExpanded ? <CollapseIcon /> : <ExpandIcon />}
                    </button>
                  )}
                </div>

                <div className="flex-1 mt-4 overflow-hidden">
                   {activeTab === "editor" && (
                     <>
                      {/* Jika Tipe TABLE, tampilkan editor canggih */}
                      {isTable && (
                        <div className="w-full h-full overflow-auto space-y-6 p-2 bg-gray-50 border rounded-lg">
                          {contentBlocks.map((block, index) => (
                            <div key={index}>
                              {block.type === 'table' && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase ml-2">Tabel #{contentBlocks.filter(b => b.type === 'table').indexOf(block) + 1}</label>
                                    <div className="h-[400px] border rounded-lg overflow-hidden bg-white shadow-sm">
                                        <AdvancedTableEditor
                                            headers={block.data.headers}
                                            rows={block.data.rows}
                                            onTableChange={(newHeaders, newRows) =>
                                                handleTableChange(index, newHeaders, newRows)
                                            }
                                        />
                                    </div>
                                </div>
                              )}
                              {/* NOTE: Anda bisa tambahkan renderer untuk block.type === 'text' 
                                di sini jika diperlukan di antara tabel
                              */}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Jika Tipe TEXT, tampilkan textarea sederhana (seperti tab Raw) */}
                      {!isTable && (
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full h-full p-6 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none leading-relaxed"
                          placeholder="Konten markdown akan muncul di sini..."
                        />
                      )}
                     </>
                  )}
                  {activeTab === "original" && (
                    <pre className="w-full h-full p-6 border-2 border-gray-200 bg-gray-50 rounded-lg overflow-auto text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                      {chunkData.chunk_content}
                    </pre>
                  )}
                  {activeTab === "preview" && (
                    <div className="w-full h-full p-4 border-2 border-gray-200 rounded-lg overflow-auto bg-white prose max-w-none">
                      {contentBlocks.map((block, index) => {
                        if (block.type === 'text') {
                          return <p key={index} className="whitespace-pre-wrap">{block.content}</p>;
                        }
                        if (block.type === 'table') {
                          return (
                            <table key={index} className="w-full text-sm border-collapse my-4">
                              <thead>
                                <tr className="bg-gray-100">
                                  {block.data.headers.map((h, i) => <th key={i} className="p-2 border font-semibold">{h}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {block.data.rows.map((row, rowIndex) => (
                                  <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => <td key={cellIndex} className="p-2 border">{cell}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  {activeTab === "raw" && (
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full p-6 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none leading-relaxed"
                      placeholder="Konten markdown akan muncul di sini..."
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl gap-4">
              <p className="text-sm text-gray-600 text-center sm:text-left flex-1">
                {activeTab === "editor"
                  ? "Gunakan editor untuk memanipulasi tabel. Klik '...' untuk aksi lebih lanjut."
                  : "Gunakan AI untuk rekonstruksi otomatis, lalu edit dan simpan hasilnya."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onReconstruct(chunkData.chunk_id)}
                  disabled={isReconstructing}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
                >
                  {isReconstructing ? <LoadingSpinner /> : <AiIcon />}
                  <span>Rekonstruksi AI</span>
                </button>
                <button
                  onClick={() => onSave(chunkData.chunk_id, editedContent)}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold"
                >
                  {isSaving ? <LoadingSpinner /> : <SaveIcon />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}