import { useLanguage } from './i18n.jsx';

export const PRICE_SLIDER_MAX = 1000000;
export const PRICE_SLIDER_STEP = 10000;
export function priceSliderValues(value) {
  if (!value) return [0, PRICE_SLIDER_MAX];
  const [min, max] = value.split(':');
  return [Number(min || 0), max ? Number(max) : PRICE_SLIDER_MAX];
}
export function serializePriceRange(min, max) {
  if (min === 0 && max === PRICE_SLIDER_MAX) return '';
  return min + ':' + (max === PRICE_SLIDER_MAX ? '' : max);
}
export function priceRangeLabel(value, money, t) {
  const [min, max] = priceSliderValues(value);
  return money(min) + ' – ' + (max === PRICE_SLIDER_MAX ? t('Không giới hạn') : money(max));
}

export default function PriceRangeFilter({ value, onChange }) {
  const { t, money } = useLanguage();
  const [min, max] = priceSliderValues(value);
  const minPercent = min / PRICE_SLIDER_MAX * 100;
  const maxPercent = max / PRICE_SLIDER_MAX * 100;
  return <fieldset className="mp-filter-group mp-price-filter">
    <legend>{t('Khoảng giá')}</legend>
    <div className="mp-price-slider" style={{ '--price-start': minPercent + '%', '--price-end': maxPercent + '%' }}>
      <div className="mp-price-track" aria-hidden="true"><span /></div>
      <input type="range" min={0} max={PRICE_SLIDER_MAX} step={PRICE_SLIDER_STEP} value={min} style={{ zIndex: min > PRICE_SLIDER_MAX / 2 ? 3 : 1 }}
        aria-label={t('Giá thấp nhất')} aria-valuetext={money(min)}
        onChange={(event) => onChange(serializePriceRange(Math.min(Number(event.target.value), max - PRICE_SLIDER_STEP), max))} />
      <input type="range" min={0} max={PRICE_SLIDER_MAX} step={PRICE_SLIDER_STEP} value={max} style={{ zIndex: 2 }}
        aria-label={t('Giá cao nhất')} aria-valuetext={max === PRICE_SLIDER_MAX ? t('Không giới hạn') : money(max)}
        onChange={(event) => onChange(serializePriceRange(min, Math.max(Number(event.target.value), min + PRICE_SLIDER_STEP)))} />
    </div>
    <div className="mp-price-values"><span>{t('Từ')}<strong>{money(min)}</strong></span><span>{t('Đến')}<strong>{max === PRICE_SLIDER_MAX ? t('Không giới hạn') : money(max)}</strong></span></div>
    <small className="mp-price-hint">{t('Kéo hai đầu để chọn khoảng giá. Mức cuối không giới hạn giá.')}</small>
  </fieldset>;
}
