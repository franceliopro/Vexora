<?php
/*
Plugin Name: Véxora Chat
Description: Chat do site integrado ao Atendimento Véxora.
Version: 1.0.0
*/
if (!defined('ABSPATH')) exit;
add_action('admin_menu', function(){add_options_page('Véxora Chat','Véxora Chat','manage_options','vexora-chat',function(){if(!current_user_can('manage_options')) return;?><div class="wrap"><h1>Véxora Chat</h1><p>Copie a URL do painel e a chave pública em Configurações → Chat para sites, na Véxora.</p><form action="options.php" method="post"><?php settings_fields('vexora_chat');?><p><label>URL da Véxora<br><input name="vexora_chat_url" type="url" class="regular-text" value="<?php echo esc_attr(get_option('vexora_chat_url'));?>" placeholder="https://vexora.suaempresa.com"></label></p><p><label>Chave pública do chat<br><input name="vexora_chat_key" class="regular-text" value="<?php echo esc_attr(get_option('vexora_chat_key'));?>"></label></p><?php submit_button();?></form></div><?php });});
add_action('admin_init',function(){register_setting('vexora_chat','vexora_chat_url',['sanitize_callback'=>function($v){$u=esc_url_raw($v,['https']);return $u?untrailingslashit($u):'';}]);register_setting('vexora_chat','vexora_chat_key',['sanitize_callback'=>function($v){return preg_match('/^[a-f0-9]{48}$/',$v)?$v:'';}]);});
add_action('wp_footer',function(){$url=get_option('vexora_chat_url');$key=get_option('vexora_chat_key');if($url&&$key)echo '<script defer src="'.esc_url($url.'/webchat-embed.js').'" data-vexora-widget="'.esc_attr($key).'"></script>';});
