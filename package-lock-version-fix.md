# Инструкция по исправлению версий React

## Проблема
При скачивании проекта на локальный компьютер Windows возникает ошибка:
```
ERROR  Warning: Error: Incompatible React versions: The "react" and "react-native-renderer" packages must have the exact same version.
```

## Решение

### 1. Установка точных версий пакетов
Выполните команду для установки совместимых версий:

```bash
npm install react@19.0.0 react-dom@19.0.0 react-test-renderer@19.0.0
```

### 2. Очистка кеша (если нужно)
```bash
rm -rf node_modules/.cache
rm -rf .expo
npm install
```

### 3. Запуск проекта
```bash
npx expo start
```

## Проверка версий
Убедитесь, что все пакеты React имеют версию 19.0.0:
```bash
npm list react react-dom react-test-renderer
```

## Важные замечания
- Используйте точные версии (без ^ или ~) для React пакетов
- При возникновении ошибок сначала очистите кеш npm и Expo
- Убедитесь, что используете совместимые версии для Expo SDK 53

## Дополнительные исправления

### Android-специфичные проблемы:
1. **expo-notifications**: В Expo Go с SDK 53 не поддерживаются push notifications. Используйте development build.
2. **expo-av**: Заменен на expo-audio и expo-video для совместимости с SDK 54.
3. **StatusBar**: Убран backgroundColor для поддержки edge-to-edge режима.
4. **React.Fragment**: Исправлена проблема с invalid style prop в navigator.