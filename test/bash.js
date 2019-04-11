//
// console.log(JSON.parse('false') === false);
// console.log(JSON.parse('1') === 1);
// console.log(JSON.parse(2) === 2);
// console.log(JSON.parse('true') === true);
// console.log(JSON.parse(true) === true);
// console.log(JSON.parse(false) === false);
//
//
// console.log('this issss a dummy chan for commit history.');

const sorter = (a,b) => b[0] > a[0] ? 1 :  (b[0] < a[0] ? -1 : 0);

for(let [k,v] of Object.entries({a:1,b:2}).sort(sorter)){
  console.log({k,v});
}
