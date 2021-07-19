const adres = "https://a410.bitrix24.ru/rest/1/xg6jilmx8dvece1f/",
      x = new XMLHttpRequest();

window.onload = function() {
  const elMenu = menu.querySelectorAll('a');
  for(i=0; i<elMenu.length; i++) {
    elMenu[i].onclick = onClickElMenu;
  }

  enter.onclick = function() {
    if(!login.value || !pass.value) alert("Жизнь прекрасна, но надо иногда и поля заполнять!")
    else  checkLogPass(login.value, pass.value);
  }
  document.querySelector('#header div').addEventListener('click', toggleMainBlocks);

  exit.onclick = function() {
    login.value = "";
    pass.value = "";
    clearAll();
    localStorage.clear();
  }
}

function toggleMainBlocks() {
  generalInf.classList.toggle('hidden');
  setting.classList.toggle('hidden');
}

function checkLogPass(login, pass) {
  x.open("GET", adres+"lists.element.get.json?IBLOCK_TYPE_ID=lists_socnet&IBLOCK_ID=73&FILTER[PROPERTY_453]="+login, true);
  x.onload = function()	{
    const responseObj = JSON.parse(x.response).result;
    if(x.status == 200)	{
      if(responseObj.length > 0) {
        for(let i in responseObj[0].PROPERTY_449) {
          if(responseObj[0].PROPERTY_449[i] === pass) {
            getDeliveryList(responseObj[0].ID);
            localStorage.setItem('login', login);
            localStorage.setItem('pass', pass);
            localStorage.setItem('id', responseObj[0].ID);
          }
          else return alert('Есть в базе такой номер, осталось подобрать пароль))');
        }
      }else return alert('Перелогинься, я тебя не знаю!');
    }else return alert('Сервер временно не доступен. Попробуйте повторить запрос чуть позже');
  }
  x.send(null);
}

function getDeliveryList(id) { // Загрузка списка заказов
  toggleMainBlocks();
  x.open("GET", adres+"crm.deal.list.json?ORDER[ID]=DESC&FILTER[UF_CRM_1624521910]="+id, true);
  x.onload = function()	{
    const responseObj = JSON.parse(x.response).result;
          noDelObj = [];
    clearAll();
    responseObj.forEach(function(obj) {
      switch(obj.STAGE_ID) {
        case "C1:PREPARATION":
          addToDeliveryList(obj);
          break;
        case "C1:WON":
        case "C1:FINAL_INVOICE":
          addToDeliveryClose(obj);
          break;
        default:
          noDelObj.push(obj);
      }
    });
    addListenerEndDelivery();
  }
  x.send(null);
}

function addToDeliveryList(obj) {
  const info = obj.SOURCE_DESCRIPTION.split("|"),
        newItem = document.createElement('tr');
  newItem.innerHTML = '<td><table class="target"><tr><th></th><th>'+obj.TITLE+'</th><th></th></tr>'+
          '<tr val="'+obj.ID+'"><td class="endDelivery" name="no"><a href="#"><img src="pic/no.svg" alt=""></a></td>'+
          '<td><a href="https://yandex.ru/maps/?mode=whatshere&whatshere%5Bpoint%5D='+info[1].split(";")[1]+'%2C'+info[1].split(";")[0]+'&whatshere%5Bzoom%5D=17" target="_blanc">'+info[0].replace(/, Россия/,'')+'</a><br>'+
          'Ближайшее метро: <b>'+info[2]+'</b><br>'+
          info[4]+': <a href="tel:+7'+info[5]+'">'+info[5]+'</a><br>'+
          'Доставка: '+obj.BEGINDATE.split("T")[0]+' '+info[3]+'<br>'+
          '<p>'+obj.COMMENTS+'</p></td>'+
          '<td class="endDelivery" name="yes"><a href="#"><img src="pic/yes.svg" alt=""></a></td></tr>'+
          '<tr class="raport hidden" name="'+obj.ID+'"><td class="left"></td>'+
          '<td><textarea value=""></textarea><br><button class="sell">Отправить</button><button class="cancel">Отмена</button></td>'+
          '<td class="right"></td></tr></table></td>';
  document.querySelector('#deliveryList tbody').append(newItem);
}

function addToDeliveryClose(obj) {
  const info = obj.SOURCE_DESCRIPTION.split("|"),
        newItem = document.createElement('tr');
  newItem.className = "close_dlvr";
  newItem.innerHTML = '<td><table><tr><th>'+obj.TITLE+'</th></tr>'+
          '<tr val="'+obj.ID+'"><td>'+info[0]+'<br>'+
          'Ближайшее метро: <b>'+info[2]+'</b><br>'+
          info[4]+': <a href="tel:+7'+info[5]+'">'+info[5]+'</a><br>'+
          'Доставка: '+obj.BEGINDATE.split("T")[0]+' '+info[3]+'<br>'+
          '<p>'+obj.COMMENTS+'</p></td></tr>'+
          '<tr class="raport" name="'+obj.ID+'"><td></td></tr></table></td>';
  document.querySelector('#deliveryFinish tbody').append(newItem);
}

function onClickElMenu(elt) {
  const name = elt.path[0].name;
  openPart(name);
}

function openPart(name) {
  sessionStorage.setItem('part', name);
  document.querySelectorAll('#generalInf div').forEach((element) => element.classList.add('hidden'));
  setting.classList.add('hidden');
  generalInf.classList.remove('hidden');
  document.getElementById(name).classList.remove('hidden');
}

function addListenerEndDelivery()  { // Подключаем обработчики выведенной информации
  const eltDelivery = document.querySelectorAll('.endDelivery');
  for(let i=0; i<eltDelivery.length; i++) {
    eltDelivery[i].onclick = endDelivery(eltDelivery[i]);
  }
}

function endDelivery(elem)  {
  const name = elem.parentNode.getAttribute('val'),
        target = document.querySelector('.raport[name="'+name+'"]');
  elem.querySelector('a').onclick = function() {
    target.parentNode.querySelectorAll('.endDelivery img').forEach((el) => el.classList.add('hidden'));
    elem.querySelector('img').classList.remove('hidden');
    target.classList.remove('hidden');
    target.querySelector('textarea').focus();
    addListenerDeliveryClose(target, elem.getAttribute('name'));
  }
}

function addListenerDeliveryClose(target, res) {
  target.querySelectorAll('button').forEach(function(elt) {
    elt.addEventListener('click', function() {
      target.parentNode.querySelectorAll('.endDelivery img').forEach((el) => el.classList.remove('hidden'));
      target.classList.add('hidden');
      if(elt === target.querySelector('.sell')) pushRaport(target, res)
      else return false;
    });
  });
  target.querySelector('textarea').addEventListener('input', function () {
    this.style.height = 0;
    this.style.height = Math.max(60,this.scrollHeight) + 'px';
  });
}

function pushRaport(trgt, res) { // Отправка данных на портал
  const id = (res === "yes")  ? "C1:WON"  : "C1:FINAL_INVOICE";
  trgt.parentNode.parentNode.classList.add('hidden');
  x.open("POST", adres+"crm.deal.update.json?ID="+trgt.getAttribute('name')+"&FIELDS[STAGE_ID]="+id, true);
  x.onload = function()	{
    sellComment(trgt);
    return alert("Миссия завершена!");
  }
  x.send(null);
}

function sellComment(trgt) {
  x.open("POST", adres+"crm.timeline.comment.add.json?FIELDS[ENTITY_ID]="+trgt.getAttribute('name')+
    "&FIELDS[ENTITY_TYPE]=DEAL&FIELDS[COMMENT]="+trgt.querySelector('textarea').value, true);
  x.onload = function()	{
  }
  x.send(null);
}

function clearAll() {
  document.querySelector('#deliveryList tbody').innerHTML = "";
  document.querySelector('#deliveryFinish tbody').innerHTML = "";
  exit.classList.toggle('hidden');
  enter.classList.toggle('hidden');
}
