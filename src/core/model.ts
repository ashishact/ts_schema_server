import {LIST, a} from "./A01_FOUNDATION/base"
// ****************************************** //

interface TeacherI {
    name: string
}

let Student = {
    name:       a.number().min(2).max(5),
    rollno:     a.string().regex(/.*/),
    marks:      a.number(LIST),
    subjects:   a.string().list().maxLength(12),
    teacher:    a.ref("Teacher").oneToOne(),
};

let Teacher = {
    name:       a.string().maxLength
}

Student.teacher










// ****************************************** //
export let s = {
    Student
}