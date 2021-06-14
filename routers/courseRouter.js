const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Course = require("../models/courseModel");
const Classroom = require("../models/classroomModel");
const courseRouter = express.Router();
const { response } = require("express");

courseRouter.post(
  "/getCourseData",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {
      res.send({course});
    } else {
      res.send("尚無此堂課程");
    }
  })
);

//用來自動允許學生加入google meet
courseRouter.post(
  "/checkStudentInList",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID, studentGoogleName } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {
        //確認更改後學號是否重複
        let studentInList = false;
        for (let i = 0; i < course.classmates.length; i++) {
          if ( course.classmates[i].studentGoogleName == studentGoogleName) {
            studentInList = true;
          }
        }
        res.send(studentInList);
    } else {
      res.send("尚無此堂課程");
    }
  })
);

//#region ==========學生名單設定部分==========

courseRouter.post(
  "/getClassmatesList",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {
        res.send(course.classmates);
    } else {
      res.send("尚無此堂課程");
    }
  })
);

courseRouter.post(
  "/addStudent",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID, studentName, studentGoogleName, studentID } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {
      let studentExisted = false;
      course.classmates.forEach((element) => {
        if (element.studentID == studentID) studentExisted = true;
      });

      if (studentExisted == true) res.send("此學生已存在");
      else {
        course.classmates.push({
          studentName: studentName,
          studentGoogleName: studentGoogleName || "",
          studentID: studentID,
        });
        //將學生名單依照學號排序
        course.classmates = ClassmatesSorting(course.classmates);

        const uploadedCourse = await course.save();
        res.send(uploadedCourse.classmates);
      }
    } else {
      res.send("尚無此堂課程");
    }
  })
);

courseRouter.post(
  "/editOneStudent",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID, studentIndex, studentName, studentGoogleName, studentID } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {
      //確認更改後學號是否重複
      if (studentID) {
        //確認更改後學號是否重複
        let studentIDExisted = false;
        for (let i = 0; i < course.classmates.length; i++) {
          if ( i != studentIndex && course.classmates[i].studentID == studentID) {
            studentIDExisted = true;
          }
        }
        if (studentIDExisted == true) {
          res.send("此學號已存在");
        }
      }

      //取代資料。注意，無法直接設定course.classmates[studentIndex]內的物件，必須取代一整個Object
      const newDate = {
        studentName: studentName || course.classmates[studentIndex].studentName,
        studentGoogleName: studentGoogleName || course.classmates[studentIndex].studentGoogleName,
        studentID: studentID || course.classmates[studentIndex].studentID,
      }
      course.classmates.splice(studentIndex, 1, newDate);

      //將學生名單依照學號排序
      course.classmates = ClassmatesSorting(course.classmates);

      const uploadedCourse = await course.save();
      res.send(uploadedCourse.classmates);
      
    } else {
      res.send("尚無此堂課程");
    }
  })
);

courseRouter.post(
  "/deleteOneStudent",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID, studentID } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {
      let studentIndex = null;
      for (let i = 0; i < course.classmates.length; i++)
        if (course.classmates[i].studentID == studentID) studentIndex = i;

      if (studentIndex != null) {
        course.classmates.splice(studentIndex, 1);
      } else {
        res.send("此學號不在名單中");
      }

      const uploadedCourse = await course.save();
      res.send(uploadedCourse.classmates);
    } else {
      res.send("尚無此堂課程");
    }
  })
);

courseRouter.post(
  "/deleteAllStudents",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {
      course.classmates = [];
      const uploadedCourse = await course.save();
      res.send(uploadedCourse.classmates);
    } else {
      res.send("尚無此堂課程");
    }
  })
);


function ClassmatesSorting(ClassmateDataArray) {
  let storage;
  //console.log(ClassmateDataArray)
  for (let i = 0; i < ClassmateDataArray.length; i++) {
    let minIndex = i;
    for (let j = i + 1; j < ClassmateDataArray.length; j++) {
      if (parseInt(ClassmateDataArray[minIndex].studentID) > parseInt(ClassmateDataArray[j].studentID)) {
        minIndex = j;
      }
    }
    storage = ClassmateDataArray[i];
    ClassmateDataArray[i] = ClassmateDataArray[minIndex];
    ClassmateDataArray[minIndex] = storage;
  }
  return ClassmateDataArray;
}



//#endregion ==========學生名單設定部分==========


//#region ==========課程週設定部分==========

courseRouter.post(
  "/linkClassroomToCourseWeek",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID, classroomDataID } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {
      const classroom = await Classroom.findById(classroomDataID);
      if(classroom){
        newTime = new Date();
        course.courseWeeks.push({
          weekName: newTime.getFullYear() + "/" + (newTime.getMonth()+1) + "/" + newTime.getDate(),
          classroomDataID: classroomDataID
        });
        const uploadedCourse = await course.save();

        classroom.courseName = course.courseName;
        classroom.isLinkToCourse = true;
        const uploadedClassroom = await classroom.save();

        res.send({
          courseName: uploadedCourse.courseName,
          weekName: uploadedCourse.courseWeeks[uploadedCourse.courseWeeks.length-1].weekName,
        });
      }else{
        res.send("尚無此教室");
      }
    } else {
      res.send("尚無此堂課程");
    }
  })
);

courseRouter.post(
  "/deleteAllCourseWeeks",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {

      course.courseWeeks.forEach(element => {
        //未完成，刪除classroom Data
      });

      course.courseWeeks = [];
      const uploadedCourse = await course.save();

      res.send(uploadedCourse.courseWeeks);
    } else {
      res.send("尚無此堂課程");
    }
  })
);

courseRouter.post(
  "/deleteOneCourseWeek",
  expressAsyncHandler(async (req, res) => {
    const { courseDataID, courseWeekIndex } = req.body;
    const course = await Course.findById(courseDataID);
    if (course) {

      if (courseWeekIndex != null) {
        //未完成，刪除指定classroom Data
        course.courseWeeks.splice(courseWeekIndex, 1);
      } else {
        res.send("請指定courseWeekIndex");
      }

      const uploadedCourse = await course.save();
      res.send(uploadedCourse.courseWeeks);
    } else {
      res.send("尚無此堂課程");
    }
  })
);

// courseRouter.post(
//   "/editOneCourseWeek",
//   expressAsyncHandler(async (req, res) => {
//     const { courseDataID, courseWeekIndex, weekName, classroomMeetID } = req.body;
//     const course = await Course.findById(courseDataID);
//     if (course) {
//       //確認更改後學號是否重複
//       if (weekName) {
//         //確認更改後學號是否重複
//         let weekNameExisted = false;
//         for (let i = 0; i < course.courseWeeks.length; i++) {
//           if ( i != courseWeekIndex && course.courseWeeks[i].weekName == weekName) {
//             weekNameExisted = true;
//           }
//         }
//         if (weekNameExisted == true) {
//           res.send("此課程週名已存在");
//         }
//       }

//       //取代資料。注意，無法直接設定course.courseWeeks[courseWeekIndex]內的物件，必須取代一整個Object
//       const newDate = {
//         weekName: weekName || course.courseWeeks[courseWeekIndex].weekName,
//         classroomMeetID: classroomMeetID || course.courseWeeks[courseWeekIndex].classroomMeetID
//       }
//       course.courseWeeks.splice(courseWeekIndex, 1, newDate);

//       const uploadedCourse = await course.save();
//       res.send(uploadedCourse.courseWeeks);
      
//     } else {
//       res.send("尚無此堂課程");
//     }
//   })
// );

//#endregion==========課程週設定部分==========

module.exports = courseRouter;
