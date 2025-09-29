package nainu.top.agi.util;

import java.util.Random;

public class FunctionNameGenerator {

    private static final String LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String LETTERS_DIGITS = LETTERS + "0123456789";
    private static final int LENGTH = 32;
    private static final Random RANDOM = new Random();

    /**
     * 生成随机名称：首字符为字母，后续31个字符为字母或数字
     * @return 32位随机字符串
     */
    public static String generate() {
        StringBuilder sb = new StringBuilder(LENGTH);
        // 首字符必须是字母
        sb.append(LETTERS.charAt(RANDOM.nextInt(LETTERS.length())));
        // 剩余字符从字母+数字中随机选择
        for (int i = 1; i < LENGTH; i++) {
            sb.append(LETTERS_DIGITS.charAt(RANDOM.nextInt(LETTERS_DIGITS.length())));
        }
        return sb.toString();
    }
}
