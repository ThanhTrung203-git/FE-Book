import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";

function field(record, names) {
  for (const name of names) {
    if (record?.[name] !== undefined && record[name] !== null) return String(record[name]);
  }
  return "";
}
const provinceIdOf = (item) => field(item, ["ProvinceID", "province_id", "_id", "id"]);
const provinceNameOf = (item) => field(item, ["ProvinceName", "province_name", "name"]);
const districtIdOf = (item) => field(item, ["DistrictID", "district_id", "_id", "id"]);
const districtNameOf = (item) => field(item, ["DistrictName", "district_name", "name"]);
const wardCodeOf = (item) => field(item, ["WardCode", "ward_code", "_id", "id"]);
const wardNameOf = (item) => field(item, ["WardName", "ward_name", "name"]);
const sameName = (a, b) => String(a || "").trim().toLocaleLowerCase("vi") === String(b || "").trim().toLocaleLowerCase("vi");

export default function GhnAddressFields({ value, setValue, token, prefix = "", profile = false, onEdit, disabled = false }) {
  const { t } = useLanguage();
  const keys = useMemo(() => ({
    provinceId: prefix ? prefix + "province_id" : "to_province_id",
    provinceName: prefix ? prefix + "province_name" : "to_province_name",
    wardCode: prefix ? prefix + "ward_code" : "to_ward_code",
    wardName: prefix ? prefix + "ward_name" : "to_ward_name",
    districtName: prefix ? prefix + "district_name" : "to_district_name",
    isNew: prefix ? prefix + "is_new_to_address" : "is_new_to_address",
  }), [prefix]);
  const isNew = Boolean(value[keys.isNew] ?? true);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [provinceError, setProvinceError] = useState("");
  const [districtError, setDistrictError] = useState("");
  const [wardError, setWardError] = useState("");
  const selectedProvince = provinces.find((item) => provinceIdOf(item) === String(value[keys.provinceId] || ""))
    || provinces.find((item) => sameName(provinceNameOf(item), value[keys.provinceName]));
  const provinceId = selectedProvince ? provinceIdOf(selectedProvince) : "";
  const selectedDistrict = districts.find((item) => sameName(districtNameOf(item), value[keys.districtName]));
  const districtId = selectedDistrict ? districtIdOf(selectedDistrict) : "";
  const selectedWard = wards.find((item) => wardCodeOf(item) === String(value[keys.wardCode] || ""))
    || wards.find((item) => sameName(wardNameOf(item), value[keys.wardName]));
  const update = (patch) => {
    if (disabled) return;
    onEdit?.();
    setValue((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    let active = true;
    setProvinces([]);
    setLoadingProvinces(true);
    setProvinceError("");
    api("/shipping/ghn/provinces" + (isNew ? "" : "?legacy=true"), { token })
      .then((result) => { if (active) setProvinces(Array.isArray(result.data) ? result.data : []); })
      .catch((error) => { if (active) setProvinceError(error.message); })
      .finally(() => { if (active) setLoadingProvinces(false); });
    return () => { active = false; };
  }, [token, isNew]);

  useEffect(() => {
    let active = true;
    setDistricts([]);
    setDistrictError("");
    if (isNew || !provinceId) {
      setLoadingDistricts(false);
      return () => { active = false; };
    }
    setLoadingDistricts(true);
    api("/shipping/ghn/provinces/" + encodeURIComponent(provinceId) + "/districts", { token })
      .then((result) => { if (active) setDistricts(Array.isArray(result.data) ? result.data : []); })
      .catch((error) => { if (active) setDistrictError(error.message); })
      .finally(() => { if (active) setLoadingDistricts(false); });
    return () => { active = false; };
  }, [provinceId, isNew, token]);

  useEffect(() => {
    let active = true;
    setWards([]);
    setWardError("");
    if (!provinceId || (!isNew && !districtId)) {
      setLoadingWards(false);
      return () => { active = false; };
    }
    setLoadingWards(true);
    const path = isNew ? "provinces/" + encodeURIComponent(provinceId) : "districts/" + encodeURIComponent(districtId);
    api("/shipping/ghn/" + path + "/wards", { token })
      .then((result) => { if (active) setWards(Array.isArray(result.data) ? result.data : []); })
      .catch((error) => { if (active) setWardError(error.message); })
      .finally(() => { if (active) setLoadingWards(false); });
    return () => { active = false; };
  }, [provinceId, districtId, isNew, token]);

  return <div className={"ghn-address-fields " + (profile ? "profile-address-fields" : "checkout-address-fields")}>
    <label>{t("Tỉnh / thành phố")}
      <select required disabled={disabled || loadingProvinces || !provinces.length} value={provinceId || (disabled ? value[keys.provinceName] || "" : "")} onChange={(event) => {
        const province = provinces.find((item) => provinceIdOf(item) === event.target.value);
        update({ [keys.provinceId]: province ? Number(provinceIdOf(province)) : null, [keys.provinceName]: provinceNameOf(province), [keys.districtName]: "", [keys.wardCode]: "", [keys.wardName]: "" });
      }}>
        <option value="">{t(loadingProvinces ? "Đang tải…" : "Chọn tỉnh / thành phố")}</option>
        {disabled && !selectedProvince && value[keys.provinceName] && <option value={value[keys.provinceName]}>{value[keys.provinceName]}</option>}
        {provinces.map((item) => <option key={provinceIdOf(item)} value={provinceIdOf(item)}>{provinceNameOf(item)}</option>)}
      </select>
    </label>
    {!isNew && <label>{t("Quận / huyện")}
      <select required disabled={disabled || !provinceId || loadingDistricts || !districts.length} value={districtId || (disabled ? value[keys.districtName] || "" : "")} onChange={(event) => {
        const district = districts.find((item) => districtIdOf(item) === event.target.value);
        update({ [keys.districtName]: districtNameOf(district), [keys.wardCode]: "", [keys.wardName]: "" });
      }}>
        <option value="">{t(loadingDistricts ? "Đang tải…" : "Chọn quận / huyện")}</option>
        {disabled && !selectedDistrict && value[keys.districtName] && <option value={value[keys.districtName]}>{value[keys.districtName]}</option>}
        {districts.map((item) => <option key={districtIdOf(item)} value={districtIdOf(item)}>{districtNameOf(item)}</option>)}
      </select>
    </label>}
    <label>{t("Phường / xã")}
      <select required disabled={disabled || !provinceId || (!isNew && !districtId) || loadingWards || !wards.length} value={selectedWard ? wardCodeOf(selectedWard) : (disabled ? value[keys.wardName] || "" : "")} onChange={(event) => {
        const ward = wards.find((item) => wardCodeOf(item) === event.target.value);
        update({ [keys.wardCode]: wardCodeOf(ward), [keys.wardName]: wardNameOf(ward) });
      }}>
        <option value="">{t(loadingWards ? "Đang tải…" : "Chọn phường / xã")}</option>
        {disabled && !selectedWard && value[keys.wardName] && <option value={value[keys.wardName]}>{value[keys.wardName]}</option>}
        {wards.map((item) => <option key={wardCodeOf(item)} value={wardCodeOf(item)}>{wardNameOf(item)}</option>)}
      </select>
    </label>
    <div className="ghn-address-options"><label className="ghn-address-old">
      <input type="checkbox" disabled={disabled} checked={!isNew} onChange={(event) => update({ [keys.isNew]: !event.target.checked, [keys.provinceId]: null, [keys.provinceName]: "", [keys.districtName]: "", [keys.wardCode]: "", [keys.wardName]: "" })} />
      {t("Địa chỉ quận/huyện cũ")}
    </label></div>
    {(provinceError || districtError || wardError) && <p role="alert" className="checkout-hint ghn-address-error">{t("Không tải được danh sách địa chỉ GHN. Vui lòng thử lại sau.")} {t(provinceError || districtError || wardError)}</p>}
  </div>;
}
