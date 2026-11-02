import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";

function field(record, names) {
  for (const name of names) {
    if (record?.[name] !== undefined && record[name] !== null) return record[name];
  }
  return "";
}

export default function GhnAddressFields({
  value,
  setValue,
  token,
  prefix = "",
  profile = false,
  onEdit,
}) {
  const { t } = useLanguage();
  const keys = useMemo(() => ({
    provinceId: prefix ? `${prefix}province_id` : "to_province_id",
    provinceName: prefix ? `${prefix}province_name` : "to_province_name",
    wardCode: prefix ? `${prefix}ward_code` : "to_ward_code",
    wardName: prefix ? `${prefix}ward_name` : "to_ward_name",
    districtName: prefix ? `${prefix}district_name` : "to_district_name",
    isNew: prefix ? `${prefix}is_new_to_address` : "is_new_to_address",
  }), [prefix]);
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [provinceId, setProvinceId] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState("");

  const set = (key, next) => {
    onEdit?.();
    setValue((current) => ({ ...current, [key]: next }));
  };

  useEffect(() => {
    let active = true;
    setLoadingProvinces(true);
    api("/shipping/ghn/provinces", { token })
      .then((result) => {
        if (active) {
          setProvinces(Array.isArray(result.data) ? result.data : []);
          setError("");
        }
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoadingProvinces(false));
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!provinces.length) return;
    const savedId = value[keys.provinceId];
    const byId = provinces.find((item) =>
      String(field(item, ["ProvinceID", "province_id", "_id", "id"])) === String(savedId || ""));
    const byName = provinces.find((item) =>
      field(item, ["ProvinceName", "province_name", "name"]).trim().toLocaleLowerCase("vi")
      === String(value[keys.provinceName] || "").trim().toLocaleLowerCase("vi"));
    const selected = byId || byName;
    const selectedId = selected
      ? String(field(selected, ["ProvinceID", "province_id", "_id", "id"]))
      : "";
    setProvinceId(selectedId);
    if (selectedId && !savedId) {
      setValue((current) => ({ ...current, [keys.provinceId]: Number(selectedId) }));
    }
  }, [provinces, keys.provinceId, keys.provinceName, value[keys.provinceId], value[keys.provinceName]]);

  useEffect(() => {
    let active = true;
    if (!provinceId) {
      setWards([]);
      setLoadingWards(false);
      return () => { active = false; };
    }
    setLoadingWards(true);
    api(`/shipping/ghn/provinces/${encodeURIComponent(provinceId)}/wards`, { token })
      .then((result) => {
        if (active) {
          setWards(Array.isArray(result.data) ? result.data : []);
          setError("");
        }
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoadingWards(false));
    return () => { active = false; };
  }, [provinceId, token]);

  const selectedWardCode = String(value[keys.wardCode] || "");
  const matchingWard = wards.find((item) =>
    String(field(item, ["WardCode", "ward_code", "_id", "id"])) === selectedWardCode
    || field(item, ["WardName", "ward_name", "name"]).trim().toLocaleLowerCase("vi")
      === String(value[keys.wardName] || "").trim().toLocaleLowerCase("vi"));
  const wardIsInList = Boolean(matchingWard);
  const selectedWardValue = matchingWard
    ? String(field(matchingWard, ["WardCode", "ward_code", "_id", "id"]) || field(matchingWard, ["WardName", "ward_name", "name"]))
    : "";

  useEffect(() => {
    const matchedCode = matchingWard
      ? String(field(matchingWard, ["WardCode", "ward_code", "_id", "id"]))
      : "";
    if (matchedCode && matchedCode !== selectedWardCode) {
      setValue((current) => ({ ...current, [keys.wardCode]: matchedCode }));
    }
  }, [matchingWard, selectedWardCode, keys.wardCode, setValue]);

  return (
    <div className={`ghn-address-fields ${profile ? "profile-address-fields" : "checkout-address-fields"}`}>
      <label>
        {t("Tỉnh / thành phố")}
        {provinces.length ? (
          <select
            required
            value={provinceId}
            onChange={(event) => {
              const selectedId = event.target.value;
              const province = provinces.find((item) =>
                String(field(item, ["ProvinceID", "province_id", "_id", "id"])) === selectedId);
              setProvinceId(selectedId);
              onEdit?.();
              set(keys.provinceId, selectedId ? Number(selectedId) : null);
              set(keys.provinceName, field(province, ["ProvinceName", "province_name", "name"]));
              set(keys.wardCode, "");
              set(keys.wardName, "");
              set(keys.districtName, "");
            }}
          >
            <option value="">{t("Chọn tỉnh / thành phố")}</option>
            {provinces.map((item) => {
              const id = field(item, ["ProvinceID", "province_id", "_id", "id"]);
              return <option key={id} value={id}>{field(item, ["ProvinceName", "province_name", "name"])}</option>;
            })}
          </select>
        ) : (
          <input
            required
            disabled={loadingProvinces}
            value={value[keys.provinceName] || ""}
            onChange={(event) => {
              set(keys.provinceId, null);
              set(keys.provinceName, event.target.value);
              set(keys.wardCode, "");
              set(keys.wardName, "");
            }}
            placeholder={loadingProvinces ? t("Đang tải…") : t("Nhập tỉnh / thành phố")}
          />
        )}
      </label>

      <label>
        {t("Phường / xã")}
        {provinceId && (loadingWards || wards.length) ? (
          <select
            required
            value={selectedWardValue || (!wardIsInList && value[keys.wardName] ? value[keys.wardName] : "")}
            disabled={loadingWards}
            onChange={(event) => {
              const ward = wards.find((item) =>
                String(field(item, ["WardCode", "ward_code", "_id", "id"])) === event.target.value);
              set(keys.wardCode, String(field(ward, ["WardCode", "ward_code", "_id", "id"])));
              set(keys.wardName, field(ward, ["WardName", "ward_name", "name"]));
            }}
          >
            <option value="">{loadingWards ? t("Đang tải…") : t("Chọn phường / xã")}</option>
            {value[keys.wardName] && !wardIsInList && (
              <option value={value[keys.wardName]}>{value[keys.wardName]} · {t("địa chỉ đã lưu")}</option>
            )}
            {wards.map((item) => {
              const code = field(item, ["WardCode", "ward_code", "_id", "id"]);
              const name = field(item, ["WardName", "ward_name", "name"]);
              return <option key={code || name} value={code || name}>{name}</option>;
            })}
          </select>
        ) : (
          <input
            required
            value={value[keys.wardName] || ""}
            onChange={(event) => {
              set(keys.wardName, event.target.value);
              set(keys.wardCode, "");
            }}
            placeholder={loadingProvinces || loadingWards ? t("Đang tải…") : t("Nhập phường / xã")}
          />
        )}
      </label>

      <label className="ghn-address-old">
        <input
          type="checkbox"
          checked={!Boolean(value[keys.isNew] ?? true)}
          onChange={(event) => set(keys.isNew, !event.target.checked)}
        />
        {t("Địa chỉ theo địa giới hành chính cũ")}
      </label>
      {!Boolean(value[keys.isNew] ?? true) && (
        <label className="ghn-address-district">
          {t("Quận / huyện")}
          <input
            required
            value={value[keys.districtName] || ""}
            onChange={(event) => set(keys.districtName, event.target.value)}
            placeholder={t("Nhập quận / huyện")}
          />
        </label>
      )}
      {error && (
        <p className="checkout-hint ghn-address-error">
          {t("Không tải được danh sách GHN; bạn có thể nhập địa chỉ bằng tay.")} {t(error)}
        </p>
      )}
    </div>
  );
}
