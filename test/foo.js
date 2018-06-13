

const getBinMap = function(bin, path, name){

  if(!bin){
    return '';
  }

  if(typeof bin === 'string'){
    return ` && ln -s "${path}/${bin}" "node_modules/.bin/${name}"`
  }

  return ` && ` + Object.keys(bin).map(function(k){
    return ` ln -sf "${path}/${bin[k]}" "node_modules/.bin/${k}"`
  })
  .join(' && ');
};



console.log(getBinMap({}, 'zzz', 'myname'))
