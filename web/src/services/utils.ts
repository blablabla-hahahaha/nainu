/**
 * "今天 / 昨天 / YYYY-MM-DD" 相对日期。
 */
export function format_date_relative(dateTimeStr?: string): string {
    // 解析输入字符串，提取年月日
    const [datePart] = dateTimeStr ? dateTimeStr.split(' ') : ''; // "2026-03-05"
    const [year, month, day] = datePart.split('-').map(Number);

    // 构造输入日期的 Date 对象（本地时间当天零点）
    const input_date = new Date(year, month - 1, day); // 月从0开始

    // 获取当前日期的零点
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 计算时间差（毫秒）
    const diff_time = today.getTime() - input_date.getTime();
    const diff_days = Math.round(diff_time / (1000 * 60 * 60 * 24));

    if (diff_days === 0) {
        return '今天';
    } else if (diff_days === 1) {
        return '昨天';
    } else {
        // 返回日期部分（可根据需要自定义格式）
        return datePart; // 例如 "2026-03-05"
    }
}
