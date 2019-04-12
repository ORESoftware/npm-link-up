


const gen = function *() {
  yield 3;
  yield 4;
  return yield 5;
};

const rator = gen();

console.log(rator.next());
console.log(rator.next());
console.log(rator.next());
console.log(rator.next());

for(let v of gen()){
  console.log('next:',v);
}


const awt = async () => {
  await 3;
  await 4;
  await 5;
};



awt().then(v => {
  console.log('final:', v);
});
