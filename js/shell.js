class Shell {
  constructor() {
  }

  /* отклик элементов меню */
  start() {
    const elMenu = menu.querySelectorAll('a'), part = sessionStorage.getItem('part');

    /* - Добавляем первичное оформление */
    if (part) document.querySelector('body').classList.add(part);

    for (let i = 0, numElMenu = elMenu.length; i < numElMenu; i++) {
      elMenu[i].onclick = (event) => {
        this.openPart(event.target.name);
        settingform.enter.click();
      };
    }

    /* - открыть/закрыть окно ввода данных регистрации */
    document.querySelector('#header div').addEventListener('click', this.toggleMainBlocks);
  }

  /* Открыть/закрыть окно общих настроек */
  toggleMainBlocks() {
    generalInf.classList.toggle('hidden');
    setting.classList.toggle('hidden');
  }

  /* Переключение между страничками */
  openPart(name) {
    let body = document.querySelector('body');

    sessionStorage.setItem('part', name);
    for (let el of generalInf.children) el.classList.add('hidden');
    document.getElementById(name).classList.remove('hidden');
    setting.classList.add('hidden');
    body.className = "";
    body.classList.add(name);
    generalInf.classList.remove('hidden');
  }

  /* отправить запрос */
  async getJsonQuest(data) {
    let params = {
          method: 'POST',
          body: data
        };

    let response = await fetch('ajax_quest.php', params);

    if( response.ok == 1 ) return await response.json();
    else return response.error;
  }

  /* Открыть последнее активное окно */
  openLastPart() {
    const part = sessionStorage.getItem('part');

    (part) ? this.openPart(part) : this.openPart('deliveryList');
  }
}

const shell = new Shell();
