import React, { useState, useEffect, useRef } from "react";

const Filter = ({
  label,
  type = "text",
  value,
  onChange,
  options = [],
  placeholder = "",
  className = "",
  name,
  disabled = false,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (type === "multiselect" && value) {
      setSelectedOptions(value);
    }
  }, [value, type]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const handleMonthChange = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const renderCalendarDays = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
    const days = [];

    // Adicionar dias vazios no início
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Adicionar dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth);
      date.setDate(i);
      const dateStr = date.toISOString().split("T")[0];
      const isStart = dateStr === value.start;
      const isEnd = dateStr === value.end;
      const isInRange =
        value.start &&
        value.end &&
        new Date(dateStr) >= new Date(value.start) &&
        new Date(dateStr) <= new Date(value.end);
      const isToday = dateStr === new Date().toISOString().split("T")[0];

      days.push(
        <button
          key={dateStr}
          onClick={() => {
            if (!value.start) {
              onChange({ target: { name: "start", value: dateStr } });
            } else if (!value.end) {
              if (new Date(dateStr) >= new Date(value.start)) {
                onChange({ target: { name: "end", value: dateStr } });
                setIsOpen(false);
              } else {
                onChange({ target: { name: "end", value: value.start } });
                onChange({ target: { name: "start", value: dateStr } });
                setIsOpen(false);
              }
            } else {
              onChange({ target: { name: "start", value: dateStr } });
              onChange({ target: { name: "end", value: "" } });
            }
          }}
          className={`
            p-2 text-sm rounded-full
            ${
              isStart || isEnd
                ? "bg-blue-500 text-white"
                : isInRange
                ? "bg-blue-100 text-blue-700"
                : isToday
                ? "bg-gray-100 text-gray-900"
                : "text-gray-700 hover:bg-gray-100"
            }
            ${isStart ? "rounded-l-full" : ""}
            ${isEnd ? "rounded-r-full" : ""}
          `}
        >
          {i}
        </button>
      );
    }

    return days;
  };

  const handleOptionClick = (option) => {
    let newSelectedOptions;
    if (selectedOptions.includes(option)) {
      newSelectedOptions = selectedOptions.filter((item) => item !== option);
    } else {
      newSelectedOptions = [...selectedOptions, option];
    }
    setSelectedOptions(newSelectedOptions);
    onChange({ target: { name, value: newSelectedOptions } });
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (type === "multiselect") {
      setSelectedOptions([]);
      onChange({ target: { name, value: [] } });
    } else if (type === "date") {
      onChange({ target: { name: "start", value: "" } });
      onChange({ target: { name: "end", value: "" } });
    } else {
      onChange({ target: { name, value: "" } });
    }
    if (onClear) onClear();
  };

  const isFilterActive = () => {
    if (type === "multiselect") return selectedOptions.length > 0;
    if (type === "date") return value.start || value.end;
    return value && value !== "";
  };

  const getActiveClass = () => {
    if (type === "daterange") return "";
    return isFilterActive() ? "border-blue-500 ring-1 ring-blue-500" : "";
  };

  const renderInput = () => {
    switch (type) {
      case "select":
        return (
          <div className="relative">
            <select
              name={name}
              value={value}
              onChange={onChange}
              disabled={disabled}
              className={`w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white appearance-none transition-all duration-200 ${getActiveClass()}`}
            >
              <option value="">{placeholder}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center gap-2">
              {isFilterActive() && (
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        );
      case "multiselect":
        return (
          <div className="relative" ref={dropdownRef}>
            <div
              className={`w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 cursor-pointer text-sm bg-white flex items-center justify-between active:bg-gray-50 transition-all duration-200 ${getActiveClass()}`}
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="truncate">
                {selectedOptions.length > 0
                  ? `${selectedOptions.length} selecionado(s)`
                  : placeholder}
              </span>
              <div className="flex items-center gap-2">
                {selectedOptions.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
            {isOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-60 overflow-y-auto">
                {options.map((option) => {
                  const displayLabel = option.label.split("(")[0].trim();
                  const isSelected = selectedOptions.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 text-sm transition-colors duration-200 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleOptionClick(option.value)}
                    >
                      {isSelected && <span className="text-blue-600">✓</span>}
                      <span
                        className={
                          isSelected ? "font-medium text-blue-600" : ""
                        }
                      >
                        {displayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case "date":
        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="date"
                name="start"
                value={value.start}
                onChange={onChange}
                disabled={disabled}
                className={`w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white appearance-none transition-all duration-200 ${getActiveClass()}`}
              />
              {value.start && (
                <button
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200"
                >
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-1 relative">
              <input
                type="date"
                name="end"
                value={value.end}
                onChange={onChange}
                disabled={disabled}
                className={`w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white appearance-none transition-all duration-200 ${getActiveClass()}`}
              />
              {value.end && (
                <button
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200"
                >
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      case "daterange":
        return (
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              name="daterange"
              value={
                value.start && value.end
                  ? `${value.start} - ${value.end}`
                  : value.start || ""
              }
              onClick={() => setIsOpen(!isOpen)}
              readOnly
              disabled={disabled}
              className={`w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white appearance-none transition-all duration-200 ${getActiveClass()}`}
              placeholder="Selecione o período..."
            />
            {isOpen && (
              <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-sm p-4 w-[300px]">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => handleMonthChange(-1)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="font-medium text-gray-700">
                    {currentMonth.toLocaleString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    onClick={() => handleMonthChange(1)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-gray-500 py-1"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {renderCalendarDays()}
                </div>
              </div>
            )}
            {(value.start || value.end) && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        );
      default:
        return (
          <div className="relative">
            <input
              type={type}
              name={name}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className={`w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white transition-all duration-200 ${getActiveClass()}`}
            />
            {type === "search" && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {value && (
                  <button
                    onClick={handleClear}
                    className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700 w-full text-center">
          {label}
        </label>
      )}
      <div className="w-full">{renderInput()}</div>
    </div>
  );
};

export default Filter;
