import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Platform } from 'react-native';
import { Checkbox, Text, TextInput, Button, Card, useTheme, FAB, ProgressBar, IconButton, Menu } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useTags } from '../hooks/useTags';
import { TagSelector } from '../components/TagSelector';
import { PrioritySelector } from '../components/PrioritySelector';

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
  const {
    tags: allTags,
    addTag: addGlobalTag,
    removeTag: removeGlobalTag,
    updateTag: updateGlobalTag,
  } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  async function scheduleTaskNotification(task: Omit<Task, 'notificationId'>): Promise<string | undefined> {
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
        alert('Разрешение на уведомления не выдано. Напоминания не будут работать.');
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
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
        <Checkbox
          status={item.completed ? 'checked' : 'unchecked'}
          onPress={() => handleToggleTask(item.id)}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.taskTitle, item.completed && styles.completed]}>{item.title}</Text>
          <View style={styles.tagsRow}>
            {item.tags.map(tagName => {
              const tag = allTags.find(t => t.name === tagName);
              return tag ? (
                <View key={tag.id} style={[styles.tag, { backgroundColor: tag.color }]}> 
                  <Text style={styles.tagText}>#{tag.name}</Text>
                </View>
              ) : null;
            })}
          </View>
          <View style={styles.metaRow}>
            {item.repeatInterval !== 'none' && (
              <Text style={styles.metaText}>
                🔁 {REPEAT_LABELS[item.repeatInterval]}
              </Text>
            )}
            {item.reminderTime && (
              <Text style={styles.metaText}>
                <Text style={{ color: '#2196f3' }}>⏰</Text> {item.reminderTime}
              </Text>
            )}
          </View>
        </View>
        <IconButton
          icon={item.reminderTime ? 'bell' : 'bell-off'}
          iconColor={item.reminderTime ? '#2196f3' : '#aaa'}
          onPress={() => handleToggleReminder(item)}
          accessibilityLabel={item.reminderTime ? 'Отключить напоминание' : 'Включить напоминание'}
        />
        <IconButton icon="delete" onPress={() => handleDeleteTask(item.id)} />
      </Card.Content>
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

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.header}>Ежедневные задачи</Text>
      {/* Выбор даты */}
      <View style={styles.dateRow}>
        <Button
          mode={formatDate(selectedDate) === formatDate(new Date()) ? 'contained' : 'outlined'}
          onPress={() => setSelectedDate(new Date())}
          style={styles.dateButton}
        >
          Сегодня
        </Button>
        <Button
          mode={formatDate(selectedDate) === formatDate(addDays(new Date(), 1)) ? 'contained' : 'outlined'}
          onPress={() => setSelectedDate(addDays(new Date(), 1))}
          style={styles.dateButton}
        >
          Завтра
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
          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />
          <Text style={styles.progressText}>{Math.round(progress * 100)}% выполнено</Text>
        </View>
      )}
      {inputVisible ? (
        <View style={styles.inputRow}>
          <TextInput
            mode="outlined"
            placeholder="Новая задача..."
            value={newTask}
            onChangeText={setNewTask}
            style={styles.input}
            autoFocus
            onSubmitEditing={handleAddTask}
          />
          <IconButton
            icon="calendar"
            onPress={() => setShowDatePicker(true)}
            style={styles.calendarButton}
          />
          <Button mode="contained" onPress={handleAddTask} style={styles.addButton}>
            Добавить
          </Button>
        </View>
      ) : (
        <FAB
          icon="plus"
          label="Новая задача"
          onPress={() => {
            setInputVisible(true);
            setNewTaskDate(selectedDate);
          }}
          style={styles.fab}
        />
      )}
      {inputVisible && (
        <View style={styles.optionsRow}>
          <Text style={styles.optionsLabel}>Приоритет:</Text>
          <PrioritySelector value={priority} onChange={setPriority} />
        </View>
      )}
      {inputVisible && (
        <View style={styles.optionsRow}>
          <Text style={styles.optionsLabel}>Метки:</Text>
          <TagSelector
            tags={allTags}
            selectedTagIds={selectedTagIds}
            onSelect={handleSelectTag}
            onAdd={(name, color) => {
              const tag = addGlobalTag(name, color);
              setSelectedTagIds(prev => [...prev, tag.id]);
            }}
            onRemove={removeGlobalTag}
          />
        </View>
      )}
      {inputVisible && (
        <View style={styles.optionsRow}>
          <Text style={styles.optionsLabel}>Повторять:</Text>
          {(['none', 'daily', 'weekly', 'monthly'] as const).map(r => (
            <Button
              key={r}
              mode={repeatInterval === r ? 'contained' : 'outlined'}
              onPress={() => setRepeatInterval(r)}
              style={styles.priorityButton}
              labelStyle={{ color: repeatInterval === r ? '#fff' : '#555' }}
              buttonColor={repeatInterval === r && r !== 'none' ? '#90caf9' : undefined}
            >
              {REPEAT_LABELS[r]}
            </Button>
          ))}
        </View>
      )}
      {inputVisible && (
        <View style={styles.optionsRow}>
          <Text style={styles.optionsLabel}>Напомнить:</Text>
          <Button
            mode={reminderTime ? 'contained' : 'outlined'}
            onPress={() => setShowTimePicker(true)}
            style={styles.priorityButton}
            labelStyle={{ color: reminderTime ? '#fff' : '#555' }}
            buttonColor={reminderTime ? '#90caf9' : undefined}
          >
            {reminderTime ? `⏰ ${reminderTime}` : 'Время'}
          </Button>
          {reminderTime && (
            <IconButton icon="close" size={16} onPress={() => setReminderTime(undefined)} />
          )}
        </View>
      )}
      {showTimePicker && (
        <DateTimePicker
          value={reminderTime ? new Date(`1970-01-01T${reminderTime}:00`) : new Date()}
          mode="time"
          is24Hour
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
      <FlatList
        data={filteredTasks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Нет задач на выбранную дату</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 16,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  fab: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  list: {
    paddingBottom: 32,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    marginLeft: 8,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  empty: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 32,
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
    marginTop: 2,
    marginBottom: 4,
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
  addButton: {
    height: 48,
    justifyContent: 'center',
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    marginLeft: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  optionsLabel: {
    fontSize: 14,
    marginRight: 8,
    color: '#888',
  },
  priorityButton: {
    marginRight: 4,
    borderWidth: 1,
  },
  tagInput: {
    flex: 1,
    minWidth: 100,
    marginRight: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 12,
    color: '#555',
    marginRight: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
});

export default TasksScreen; 