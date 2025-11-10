export function getSafetyGrade(score: number): string {
    if (score >= 80) return "A";
    if (score >= 60) return "B";
    if (score >= 40) return "C";
    return "D";
}

export function getGradeColor(grade: string): string {
    switch (grade) {
        case "A":
            return "#2ecc71"; // green
        case "B":
            return "#f1c40f"; // yellow
        case "C":
            return "#e67e22"; // orange
        case "D":
            return "#e74c3c"; // red
        default:
            return "#bdc3c7"; // gray
    }
}
