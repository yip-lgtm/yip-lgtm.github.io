(function(){
  function bind(id){
    var el=document.getElementById(id);
    if(!el) return;
    el.setAttribute("type","text");
    el.setAttribute("inputmode","decimal");
    el.setAttribute("lang","en");
    el.setAttribute("autocomplete","off");
  }
  ["h","t","inKg","inBf","inMk","inBmr","km"].forEach(bind);
})();
