import fs from 'node:fs';
const scale=[['A+',4],['A',4],['A-',3.7],['B+',3.3],['B',3],['B-',2.7],['C+',2.3],['C',2],['C-',1.7],['D+',1.3],['D',1],['F',0]].map(([label,points])=>({label,points,completed:label!=='F'}));
scale.push({label:'P',points:null,completed:true},{label:'I',points:null,completed:false},{label:'W',points:null,completed:false});
const course=(id,courseId,name,grade)=>({id,courseId,name,grade,code:'CS201',credits:3,excluded:false});
const data={version:2,scale,semesters:[{id:'past',order:0,name:'Spring 2026',status:'completed',courses:[course('old','ds','Database Systems','D')]},{id:'now',order:1,name:'Fall 2026',status:'in-progress',courses:[course('retake','ds','Database Systems',null),course('algo','algo','Algorithms',null)]}],preferences:{theme:'light',precision:2,onboarded:true},target:{gpa:3.5,credits:15},scenarios:[]};
fs.writeFileSync('.runtime/assessment-legacy.json',JSON.stringify(data));
