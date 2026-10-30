// Display labels only. Category IDs and stored names remain API values.
const categoryNames = [
  ["Add a comment", "Thêm bình luận"],
  ["Art", "Nghệ thuật"],
  ["Autobiography", "Tự truyện"],
  ["Biography", "Tiểu sử"],
  ["Business", "Kinh doanh"],
  ["Children's", "Thiếu nhi"],
  ["Christian", "Kitô giáo"],
  ["Christian Fiction", "Tiểu thuyết Kitô giáo"],
  ["Contemporary", "Văn học đương đại"],
  ["Crime", "Tội phạm"],
  ["Default", "Mặc định"],
  ["Fantasy", "Kỳ ảo"],
  ["Fiction", "Văn học hư cấu"],
  ["Food and Drink", "Ẩm thực"],
  ["Health", "Sức khỏe"],
  ["Historical Fiction", "Tiểu thuyết lịch sử"],
  ["History", "Lịch sử"],
  ["Horror", "Kinh dị"],
  ["Music", "Âm nhạc"],
  ["Mystery", "Trinh thám"],
  ["New Adult", "Văn học tuổi trưởng thành"],
  ["Nonfiction", "Sách phi hư cấu"],
  ["Philosophy", "Triết học"],
  ["Poetry", "Thơ"],
  ["Politics", "Chính trị"],
  ["Religion", "Tôn giáo"],
  ["Romance", "Lãng mạn"],
  ["Science", "Khoa học"],
  ["Science Fiction", "Khoa học viễn tưởng"],
  ["Self Help", "Phát triển bản thân"],
  ["Sequential Art", "Truyện tranh"],
  ["Spirituality", "Tâm linh"],
  ["Thriller", "Giật gân"],
  ["Travel", "Du lịch"],
  ["Women's Fiction", "Văn học nữ giới"],
  ["Young Adult", "Văn học thanh thiếu niên"],
];

const normalize = (name) => name.normalize("NFKC").toLocaleLowerCase("vi-VN").replace(/[\s'’‘-]+/g, "");
const labels = new Map(categoryNames.flatMap(([en, vi]) => [
  [normalize(en), { en, vi }],
  [normalize(vi), { en, vi }],
]));

export function localizeCategory(name, language = "vi") {
  if (typeof name !== "string") return name ?? "";
  const entry = labels.get(normalize(name));
  return entry ? entry[language === "en" ? "en" : "vi"] : name;
}
