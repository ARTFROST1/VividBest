import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Platform } from 'react-native';
import { Checkbox, Text, TextInput, Button, Card, useTheme, FAB, ProgressBar, IconButton, Menu, Divider, Chip } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useTags } from '../hooks/useTags';
import { TagSelector } from '../components/TagSelector';
import { PrioritySelector } from '../components/PrioritySelector';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  repeatInterval: 'none' | 'daily' | 'weekly' | 'monthly';
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
  const [repeatInterval, setRepeatInterval] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
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
      if (reminderTime) {
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

  const filteredTasks = tasks
    .filter(task => task.dueDate === formatDate(selectedDate))
    .sort((a, b) => {
      const order = { high: 2, medium: 1, low: 0 };
      return order[b.priority] - order[a.priority];
    });

  const completedCount = filteredTasks.filter(t => t.completed).length;
  const progress = filteredTasks.length > 0 ? completedCount / filteredTasks.length : 0;

  const renderItem = ({ item }: { item: Task }) => (
    <Card style={[styles.taskCard, { backgroundColor: colors.surface, borderRadius: roundness, shadowColor: c.text + '22' }]}> 
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
        <IconButton icon="delete" onPress={() => handleDeleteTask(item.id)} iconColor={c.error} />
      </View>
    </Card>
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

  return (
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
        <IconButton
          icon="calendar"
          onPress={() => setShowDatePicker(true)}
          style={styles.calendarButton}
        />
        <Text style={styles.selectedDateText}>{selectedDate.toLocaleDateString('ru-RU')}</Text>
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
          <ProgressBar progress={progress} color={colors.primary} style={styles.progressBar} />
          <Text style={styles.progressText}>{Math.round(progress * 100)}% {t('completed', 'выполнено')}</Text>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          value={newTask}
          onChangeText={setNewTask}
          placeholder={t('add_task_placeholder', 'Новая задача...')}
          style={[styles.input, { backgroundColor: colors.surface, color: c.text, borderRadius: 12 }]}
          placeholderTextColor={c.placeholder}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        <Button mode="contained" onPress={handleAddTask} style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: roundness }]} textColor={colors.onPrimary}>
          +
        </Button>
      </View>
      {/* Блок тонкой настройки — только при фокусе на поле ввода */}
      {isInputFocused && (
        <View style={styles.optionsRow}>
          {/* PrioritySelector с равномерным flex */}
          <View style={styles.priorityRow}>
            {(['low', 'medium', 'high'] as const).map((p, idx, arr) => (
              <Chip
                key={p}
                selected={priority === p}
                style={{ flex: 1, marginRight: idx < arr.length - 1 ? 8 : 0, backgroundColor: PRIORITY_COLORS[p] }}
                textStyle={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}
                onPress={() => setPriority(p)}
              >
                {PRIORITY_LABELS[p]}
              </Chip>
            ))}
          </View>
          {/* RepeatInterval */}
          <View style={styles.repeatRow}>
            {(['none', 'daily', 'weekly', 'monthly'] as const).map((interval) => (
              <Chip
                key={interval}
                selected={repeatInterval === interval}
                style={{ marginRight: 8, backgroundColor: repeatInterval === interval ? colors.primary : colors.surface }}
                textStyle={{ color: repeatInterval === interval ? colors.onPrimary : c.text }}
                onPress={() => setRepeatInterval(interval)}
              >
                {REPEAT_LABELS[interval]}
              </Chip>
            ))}
          </View>
          {/* Напоминание */}
          <View style={styles.reminderRow}>
            <Chip
              icon="alarm"
              selected={!!reminderTime}
              style={{ backgroundColor: !!reminderTime ? colors.primary : colors.surface }}
              textStyle={{ color: !!reminderTime ? colors.onPrimary : c.text }}
              onPress={() => setShowTimePicker(true)}
            >
              {reminderTime ? reminderTime : t('set_reminder', 'Напоминание')}
            </Chip>
            {!!reminderTime && (
              <IconButton icon="close" size={20} onPress={() => setReminderTime(undefined)} />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={reminderTime ? new Date(`${formatDate(newTaskDate)}T${reminderTime}:00`) : new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    const h = date.getHours().toString().padStart(2, '0');
                    const m = date.getMinutes().toString().padStart(2, '0');
                    setReminderTime(`${h}:${m}`);
                  }
                }}
              />
            )}
          </View>
        </View>
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
});

export default TasksScreen; 