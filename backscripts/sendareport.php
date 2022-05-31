<?php

  if( isset($_POST['dlvr_id']) )
  {
    /* Доставлено */
    if( isset($_POST['pay']) )
    {
      $fields_update_deal = array( 'STAGE_ID' => 'C1:WON' );

      if($_POST['pay'] == 'combopay')
      {
        $comment = 'Комбооплата по эквайрингу и наличными';
        $fields_update_deal = array_merge($fields_update_deal, array(
          'UF_CRM_A410DLV_PAYMT' => 'Комбооплата',
          'UF_CRM_A410DLV_RECPT' => 1,
          'UF_CRM_A410DLV_CASH' => str_replace(' ','',$_POST['payoncash']) . ',' . $_POST['kopeek'],
          'UF_CRM_A410DLV_FOTO' => [
            'fileData' => [
              $_FILES['payoncashless']['name'],
              base64_encode( file_get_contents($_FILES['payoncashless']['tmp_name']) )
            ]
          ]
        ));
      }
      elseif($_POST['pay'] == 'cash')
      {
        $fields_update_deal = array_merge($fields_update_deal, array(
          'UF_CRM_A410DLV_CASH' => str_replace(' ','',$_POST['payoncash']) . ',' . $_POST['kopeek'],
          'UF_CRM_A410DLV_PAYMT' => 'Наличные'
        ));
        $comment = 'Получено наличными: ' . $_POST['payoncash'] . ',' . $_POST['kopeek'];
      }
      elseif($_POST['pay'] == 'cashless')
      {
        // print_r(json_encode($_FILES['payoncashless']['size']));
        // if( $_FILES['payoncashless']['size'] < 4096 )
        // {
          $comment = 'Оплачено через эквайринг';
          $fields_update_deal = array_merge($fields_update_deal, array(
            'UF_CRM_A410DLV_PAYMT' => 'Эквайринг',
            'UF_CRM_A410DLV_RECPT' => 1,
            'UF_CRM_A410DLV_FOTO' => [
              'fileData' => [
                $_FILES['payoncashless']['name'],
                base64_encode( file_get_contents($_FILES['payoncashless']['tmp_name']) )
              ]
            ]
          ));
        // }
        // else print_r(json_encode('Файл слишком большой для загрузки'));
      }
      else $comment = 'Доставлено без получения оплаты';
    }
    /* Не доставлено */
    elseif( isset($_POST['reasonCancellation']) )
    {
      switch ($_POST['reasonCancellation'])
      {
        case 'noContact':
          $fields_update_deal = array( 'STAGE_ID' => 'C1:1' );
          $comment = 'Не удалось связаться по указанным номерам';
        break;
        case 'postponement':
          $fields_update_deal = array( 'STAGE_ID' => 'C1:PREPAYMENT_INVOICE' );
          $comment = 'Перенос доставки на другое время';
        break;
        case 'cancel_deal':
          $fields_update_deal = array( 'STAGE_ID' => 'C1:FINAL_INVOICE' );
          $comment = 'Клиент отказался от товара';
        break;
        default:
          $comment = '';
        break;
      }
    }
    /* Просто отправить сообщение */
    else
    {
      $comment = '';
      $fields_update_deal = array();
    }

    $equalComment = array_merge($fields_update_deal, array('UF_CRM_A410DLV_CMMNT' => $_POST['totalComment'] . $comment) );

    $arData = [
      /* - передать данные */
      'deal_update' => [
        'method' => 'crm.deal.update',
        'params' => [
          'ID' => $_POST['dlvr_id'],
          'fields' => $equalComment
        ]
      ],
      /* - сообщение в таймлайн */
      'add_comment_timeline' => [
        'method' => 'crm.timeline.comment.add',
        'params' => [
          'fields' => [
            'ENTITY_ID' => $_POST['dlvr_id'],
            'ENTITY_TYPE' => 'DEAL',
            'COMMENT' => $comment . $_POST['comment'],
            'AUTHOR_ID' => $_POST['user_id']
          ]
        ]
      ]
    ];
    
    CRest::callBatch($arData, $halt = 0);
    
    if( empty($fields_update_deal) ) print_r('message');
    else print_r(json_encode('Доставка завершена'));
  }
