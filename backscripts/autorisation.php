<?php
/* - Ищем пользователя с заданной почтой */
  $search_user = CRest::call(
    'user.search',
    [
      'filter' => [
        'ACTIVE' => 1,
        'EMAIL' => $_POST['email']
      ]
    ]
  );

  $person = $search_user['result'][0];

  /* - Если пользователь найден, проверяем соответствие номера указанного телефона */
  if( isset($person) && $person['WORK_PHONE'] == '+7'.$_POST['phone'] )
  {
    $delivery_deals = CRest::call(
      'crm.deal.list',
      [
        'order' => ['ID' => 'DESC'],
        'filter' => [
          'CATEGORY_ID' => 1,
          'STAGE_ID' => 'C1:PREPARATION',
          'UF_CRM_COURIER_ID' => $person['ID']
        ],
        'select' => ['*', 'UF_*']
      ]
    );

    $result = array_merge($delivery_deals, array('name' => $person['NAME'], 'user_id' => $person['ID']) );
    print_r( json_encode($result) );
  }
  else print( json_encode('Пользователь с такими данными не найден!') );
   