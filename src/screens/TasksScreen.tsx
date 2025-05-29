import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Platform, Animated, Switch, ActionSheetIOS, Modal, TouchableOpacity, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, LayoutChangeEvent } from 'react-native';
import { Checkbox, Text, TextInput, Button, Card, useTheme, FAB, ProgressBar, Menu, Divider, Chip } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useTags } from '../hooks/useTags';
import { TagSelector } from '../components/TagSelector';
import { PrioritySelector } from '../components/PrioritySelector';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  repeatInterval: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminderTime?: string; // HH:mm
  notificationId?: string;
}

const PRIORITY_COLORS = {
  low: '#8BC34A',
  medium: '#FFC107',
  high: '#F44336',
};

const PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const REPEAT_LABELS = {
  none: 'Не повторять',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Каждый год',
};

const TASKS_STORAGE_KEY = 'TASKS_V1';

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const TasksScreen = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState(new Date());
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [repeatInterval, setRepeatInterval] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [reminderTime, setReminderTime] = useState<string | undefined>(undefined);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const theme = useTheme();
  const { colors, roundness } = theme;
  const c = colors as any;
  const {
    tags: allTags,
    addTag: addGlobalTag,
    removeTag: removeGlobalTag,
    updateTag: updateGlobalTag,
  } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { t } = useTranslation();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [optionsAnim] = useState(new Animated.Value(0));
  const [showDatePickerInline, setShowDatePickerInline] = useState(false);
  const [showTimePickerInline, setShowTimePickerInline] = useState(false);
  const inputRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const saved = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
        if (saved) {
          const parsed: Task[] = JSON.parse(saved);
          setTasks(parsed);
          // Восстановить уведомления для актуальных задач
          parsed.forEach(async (task) => {
            if (!task.completed && task.reminderTime && !task.notificationId) {
              const notificationId = await scheduleTaskNotification(task);
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, notificationId } : t
                )
              );
            }
          });
        }
      } catch (e) {
        console.error('Ошибка загрузки задач:', e);
      }
    };
    loadTasks();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const filteredTasks = tasks
    .filter(task => task.dueDate === formatDate(selectedDate))
    .sort((a, b) => {
      const order = { high: 2, medium: 1, low: 0 };
      return order[b.priority] - order[a.priority];
    });

  const completedCount = filteredTasks.filter(t => t.completed).length;
  const progress = filteredTasks.length > 0 ? completedCount / filteredTasks.length : 0;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  async function scheduleTaskNotification(task: Task): Promise<string | undefined> {
    if (!task.reminderTime) return undefined;
    const [h, m] = task.reminderTime.split(':').map(Number);
    const due = new Date(task.dueDate + 'T' + task.reminderTime + ':00');
    if (due < new Date()) return undefined;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Напоминание о задаче',
        body: task.title,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        year: due.getFullYear(),
        month: due.getMonth() + 1, // JS: 0-11, Expo: 1-12
        day: due.getDate(),
        hour: due.getHours(),
        minute: due.getMinutes(),
        second: 0,
        repeats: false,
      },
    });
    return id;
  }

  async function cancelTaskNotification(notificationId?: string) {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  }

  const handleSelectTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  async function updateTaskNotification(task: Task): Promise<string | undefined> {
    if (task.notificationId) {
      await cancelTaskNotification(task.notificationId);
    }
    if (task.reminderTime) {
      return await scheduleTaskNotification(task);
    }
    return undefined;
  }

  async function ensureNotificationPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: reqStatus } = await Notifications.requestPermissionsAsync();
      if (reqStatus !== 'granted') {
        alert(t('notification_permission_denied', 'Разрешение на уведомления не выдано. Напоминания не будут работать.'));
        return false;
      }
    }
    return true;
  }

  const handleAddTask = async () => {
    if (newTask.trim()) {
      let notificationId: string | undefined = undefined;
      if (reminderTime && sendNotification) {
        const hasPerm = await ensureNotificationPermission();
        if (hasPerm) {
          notificationId = await scheduleTaskNotification({
            id: '',
            title: newTask.trim(),
            completed: false,
            dueDate: formatDate(newTaskDate),
            priority,
            tags: selectedTagIds.map(id => allTags.find(t => t.id === id)?.name || ''),
            repeatInterval,
            reminderTime,
            notificationId: undefined,
          });
        }
      }
      setTasks(prev => [
        {
          id: Date.now().toString(),
          title: newTask.trim(),
          completed: false,
          dueDate: formatDate(newTaskDate),
          priority,
          tags: selectedTagIds.map(id => allTags.find(t => t.id === id)?.name || ''),
          repeatInterval,
          reminderTime,
          notificationId,
        },
        ...prev,
      ]);
      setNewTask('');
      setInputVisible(false);
      setNewTaskDate(selectedDate);
      setPriority('medium');
      setSelectedTagIds([]);
      setRepeatInterval('none');
      setReminderTime(undefined);
    }
  };

  function getNextDate(date: Date, interval: 'daily' | 'weekly' | 'monthly') {
    const d = new Date(date);
    if (interval === 'daily') d.setDate(d.getDate() + 1);
    if (interval === 'weekly') d.setDate(d.getDate() + 7);
    if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
    return d;
  }

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        if (!task.completed && task.repeatInterval !== 'none') {
          const nextDate = getNextDate(new Date(task.dueDate), task.repeatInterval as any);
          (async () => {
            let notificationId: string | undefined = undefined;
            if (task.reminderTime) {
              notificationId = await scheduleTaskNotification({
                ...task,
                dueDate: formatDate(nextDate),
              });
            }
            setTasks(tasks => [
              ...tasks,
              {
                ...task,
                id: Date.now().toString() + Math.random(),
                completed: false,
                dueDate: formatDate(nextDate),
                notificationId,
              },
            ]);
          })();
        }
        if (!task.completed && task.notificationId) {
          cancelTaskNotification(task.notificationId);
        }
        return { ...task, completed: !task.completed };
      }
      return task;
    }));
  };

  const handleToggleReminder = async (task: Task) => {
    if (task.reminderTime) {
      if (task.notificationId) await cancelTaskNotification(task.notificationId);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminderTime: undefined, notificationId: undefined } : t));
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 5);
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const reminderTime = `${h}:${m}`;
      const hasPerm = await ensureNotificationPermission();
      let notificationId: string | undefined = undefined;
      if (hasPerm) {
        notificationId = await scheduleTaskNotification({ ...task, reminderTime });
      }
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminderTime, notificationId } : t));
    }
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.notificationId) {
      await cancelTaskNotification(task.notificationId);
    }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const renderRightActions = (item: Task) => (
    <TouchableOpacity
      style={styles.swipeDeleteButton}
      onPress={() => handleDeleteTask(item.id)}
    >
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Task }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
      <Card style={[styles.taskCard, { backgroundColor: colors.surface, borderRadius: roundness, shadowColor: c.text + '22', elevation: 2 }]}> 
        <View style={styles.taskRow}>
          <Checkbox
            status={item.completed ? 'checked' : 'unchecked'}
            onPress={() => handleToggleTask(item.id)}
            color={PRIORITY_COLORS[item.priority]}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, { color: c.text, textDecorationLine: item.completed ? 'line-through' : 'none' }]}>{item.title}</Text>
            <View style={styles.taskMetaRow}>
              <Text style={[styles.taskMeta, { color: c.placeholder }]}>{item.dueDate}</Text>
              <Text style={[styles.taskMeta, { color: PRIORITY_COLORS[item.priority], fontWeight: 'bold' }]}>{PRIORITY_LABELS[item.priority]}</Text>
              {item.tags && item.tags.map(tag => (
                <Text key={tag} style={[styles.tag, { backgroundColor: c.chipBg, color: c.chipText, borderRadius: roundness}]}>{tag}</Text>
              ))}
            </View>
          </View>
        </View>
      </Card>
    </Swipeable>
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleNewTaskDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setNewTaskDate(date);
  };

  const handleInputFocus = () => setIsInputFocused(true);
  const handleInputBlur = () => {
    if (!newTask.trim()) setIsInputFocused(false);
  };

  // Анимация появления/скрытия блока опций
  useEffect(() => {
    if (isInputFocused) {
      Animated.timing(optionsAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(optionsAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [isInputFocused]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text variant="titleLarge" style={styles.header}>{t('daily_tasks')}</Text>
        {/* Выбор даты */}
        <View style={styles.dateRow}>
          <Button
            mode={formatDate(selectedDate) === formatDate(new Date()) ? 'contained' : 'outlined'}
            onPress={() => setSelectedDate(new Date())}
            style={styles.dateButton}
          >
            {t('today', 'Сегодня')}
          </Button>
          <Button
            mode={formatDate(selectedDate) === formatDate(addDays(new Date(), 1)) ? 'contained' : 'outlined'}
            onPress={() => setSelectedDate(addDays(new Date(), 1))}
            style={styles.dateButton}
          >
            {t('tomorrow', 'Завтра')}
          </Button>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              themeVariant={theme.dark ? 'dark' : 'light'}
              onChange={(event, date) => {
                if (date) setSelectedDate(date);
              }}
              style={{ width: 140 }}
            />
          </View>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        {filteredTasks.length > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { backgroundColor: c.divider, overflow: 'hidden' }]}
              onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
            >
              <LinearGradient
                colors={['#7745dc', '#f34f8c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {barWidth > 0 && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: animatedProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [barWidth, 0],
                    }),
                    backgroundColor: c.divider,
                  }}
                />
              )}
            </View>
            <Text style={styles.progressText}>{Math.round(progress * 100)}% {t('completed', 'выполнено')}</Text>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={newTask}
            onChangeText={setNewTask}
            placeholder={t('add_task_placeholder', 'Новая задача...')}
            style={[styles.input, { backgroundColor: colors.surface, color: c.text, borderRadius: roundness, borderColor: c.divider }]}
            placeholderTextColor={c.placeholder}
            onFocus={handleInputFocus}
            onBlur={() => {}}
          />
        </View>
        {/* Блок создания заметки только при isInputFocused */}
        {isInputFocused && (
          <Animated.View
            style={{
              opacity: optionsAnim,
              transform: [{ translateY: optionsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              marginBottom: 12,
              backgroundColor: colors.elevation?.level2 || (theme.dark ? colors.surface : colors.background),
              borderRadius: roundness * 2,
              padding: 16,
              shadowColor: theme.dark ? '#000' : '#222',
              shadowOpacity: 0.10,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <View style={[styles.iosBlock, { backgroundColor: colors.surface, borderRadius: roundness * 1.5, shadowColor: c.text + '18' }]}> 
              {/* Одна строка: дата слева, время справа */}
              <View style={styles.iosRowHorizontal}>
                {/* Левая часть — дата */}
                <View style={styles.iosCol}>
                  <Text style={[styles.iosLabel, { color: c.text }]}>{t('date', 'Дата')}</Text>
                  <DateTimePicker
                    value={newTaskDate}
                    mode="date"
                    display="default"
                    themeVariant={theme.dark ? 'dark' : 'light'}
                    onChange={(event, date) => {
                      if (date) setNewTaskDate(date);
                    }}
                    style={{ width: 120 }}
                  />
                </View>
                {/* Правая часть — время */}
                <View style={styles.iosCol}>
                  <Text style={[styles.iosLabel, { color: c.text }]}>{t('time', 'Время')}</Text>
                  <DateTimePicker
                    value={reminderTime ? new Date(`${formatDate(newTaskDate)}T${reminderTime}:00`) : newTaskDate}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    themeVariant={theme.dark ? 'dark' : 'light'}
                    onChange={(event, date) => {
                      if (date) {
                        const h = date.getHours().toString().padStart(2, '0');
                        const m = date.getMinutes().toString().padStart(2, '0');
                        setReminderTime(`${h}:${m}`);
                      }
                    }}
                    style={{ width: 120 }}
                  />
                </View>
              </View>
              {/* Остальные элементы блока (приоритет, повтор, переключатель, +Добавить) идут ниже, с отступами */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
                <Text style={[styles.iosMeta, { color: PRIORITY_COLORS[priority] }]}>{PRIORITY_LABELS[priority]}</Text>
                <Text style={[styles.iosMeta, { color: c.text }]}>{REPEAT_LABELS[repeatInterval]}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.iosButton, { flex: 1, marginRight: 8, backgroundColor: colors.background, borderColor: c.divider, borderRadius: roundness }]}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      ActionSheetIOS.showActionSheetWithOptions({
                        options: [PRIORITY_LABELS.low, PRIORITY_LABELS.medium, PRIORITY_LABELS.high, t('cancel', 'Отмена')],
                        cancelButtonIndex: 3,
                        title: t('priority', 'Приоритет'),
                      }, (buttonIndex) => {
                        if (buttonIndex === 0) setPriority('low');
                        if (buttonIndex === 1) setPriority('medium');
                        if (buttonIndex === 2) setPriority('high');
                      });
                    } else {
                      setShowPriorityModal(true);
                    }
                  }}
                >
                  <Text style={[styles.iosButtonText, { color: c.text }]}>{t('priority', 'Приоритет')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iosButton, { flex: 1, backgroundColor: colors.background, borderColor: c.divider, borderRadius: roundness }]}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      ActionSheetIOS.showActionSheetWithOptions({
                        options: [REPEAT_LABELS.none, REPEAT_LABELS.daily, REPEAT_LABELS.weekly, REPEAT_LABELS.monthly, REPEAT_LABELS.yearly, t('cancel', 'Отмена')],
                        cancelButtonIndex: 5,
                        title: t('repeat', 'Повторять'),
                      }, (buttonIndex) => {
                        if (buttonIndex === 0) setRepeatInterval('none');
                        if (buttonIndex === 1) setRepeatInterval('daily');
                        if (buttonIndex === 2) setRepeatInterval('weekly');
                        if (buttonIndex === 3) setRepeatInterval('monthly');
                        if (buttonIndex === 4) setRepeatInterval('yearly');
                      });
                    } else {
                      setShowRepeatModal(true);
                    }
                  }}
                >
                  <Text style={[styles.iosButtonText, { color: c.text }]}>{t('repeat', 'Повторять')}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ flex: 1, color: c.text }}>{t('send_notification', 'Отправить уведомление')}</Text>
                <Switch
                  value={sendNotification}
                  onValueChange={setSendNotification}
                  thumbColor={sendNotification ? colors.primary : c.divider}
                  trackColor={{ true: colors.primary + '55', false: c.divider }}
                />
              </View>
              {/* Две кнопки внизу: Отмена и Добавить */}
              <View style={styles.iosButtonRow}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setIsInputFocused(false);
                    setNewTask('');
                    if (inputRef.current) inputRef.current.blur();
                  }}
                  style={[styles.iosCancelBtn, { borderColor: colors.primary, borderRadius: roundness }]}
                  textColor={colors.primary}
                >
                  {t('cancel', 'Отмена')}
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    handleAddTask();
                    setIsInputFocused(false);
                    if (inputRef.current) inputRef.current.blur();
                  }}
                  style={[styles.iosAddBtn, { backgroundColor: colors.primary, borderRadius: roundness }]}
                  textColor={colors.onPrimary}
                >
                  {t('add', 'Добавить')}
                </Button>
              </View>
            </View>
            {/* Модальные окна для Android (если нужно) */}
            <Modal visible={showPriorityModal} transparent animationType="fade" onRequestClose={() => setShowPriorityModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface, borderRadius: roundness }]}> 
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <TouchableOpacity key={p} onPress={() => { setPriority(p); setShowPriorityModal(false); }} style={styles.modalOption}>
                      <Text style={{ color: c.text, fontSize: 18 }}>{PRIORITY_LABELS[p]}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setShowPriorityModal(false)} style={styles.modalOption}>
                    <Text style={{ color: c.error, fontSize: 18 }}>{t('cancel', 'Отмена')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            <Modal visible={showRepeatModal} transparent animationType="fade" onRequestClose={() => setShowRepeatModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface, borderRadius: roundness }]}> 
                  {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((interval) => (
                    <TouchableOpacity key={interval} onPress={() => { setRepeatInterval(interval as any); setShowRepeatModal(false); }} style={styles.modalOption}>
                      <Text style={{ color: c.text, fontSize: 18 }}>{REPEAT_LABELS[interval]}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setShowRepeatModal(false)} style={styles.modalOption}>
                    <Text style={{ color: c.error, fontSize: 18 }}>{t('cancel', 'Отмена')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </Animated.View>
        )}
        <Divider style={[styles.divider, { backgroundColor: c.divider }]} />
        <FlatList
          data={filteredTasks}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <Divider style={[styles.divider, { backgroundColor: c.divider }]} />}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 16,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 3, /* высота поля ввода */
    borderWidth: 0,
    elevation: 2,
  },
  addBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  divider: {
    height: 0,
    marginVertical: 4,
  },
  listContent: {
    paddingBottom: 32,
  },
  taskCard: {
    marginBottom: 8,
    elevation: 2,
    padding: 0,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskMeta: {
    fontSize: 13,
    marginRight: 8,
  },
  tag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
    marginRight: 0,
    fontWeight: 'bold',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButton: {
    marginRight: 8,
  },
  calendarButton: {
    marginRight: 8,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'right',
    color: '#888',
    fontSize: 12,
    marginTop: 1,
    marginBottom: 2,
  },
  optionsRow: {
    marginBottom: 8,
    gap: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iosBlock: {
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#222',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  iosRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  iosCol: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iosLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  iosPickerWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iosPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    marginBottom: 2,
    marginTop: 2,
  },
  iosPickerValue: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  iosInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 0,
    minHeight: 40,
    justifyContent: 'center',
  },
  iosInputText: {
    fontSize: 16,
    fontWeight: '500',
  },
  iosMeta: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
  },
  iosButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 0,
  },
  iosButtonText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    minWidth: 240,
    alignItems: 'stretch',
  },
  modalOption: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  iosButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  iosCancelBtn: {
    flex: 1,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1.5,
  },
  iosAddBtn: {
    flex: 1,
    borderRadius: 12,
    marginLeft: 8,
  },
  swipeDeleteButton: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '80%',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: 3,
  },
  swipeDeleteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default TasksScreen; 