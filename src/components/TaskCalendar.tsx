import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  Dimensions,
} from 'react-native';
import { useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
}

interface TaskCalendarProps {
  tasks: Task[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onTaskPress?: (task: Task) => void;
}

const PRIORITY_COLORS = {
  low: '#83be7d',
  medium: '#ebbf5a',
  high: '#bf4c38',
};

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const TaskCalendar: React.FC<TaskCalendarProps> = ({
  tasks,
  selectedDate,
  onDateSelect,
  onTaskPress,
}) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  
  const { width } = Dimensions.get('window');
  const cellSize = (width - 60) / 7; // 60 для отступов

  // Получаем все дни текущего месяца
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Получаем первый понедельник для отображения (может быть из предыдущего месяца)
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Понедельник = 0
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    const weeks = [];
    const currentDate = new Date(startDate);
    
    // Генерируем 6 недель
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateString = currentDate.toISOString().split('T')[0];
        const dayTasks = tasks.filter(task => task.dueDate === dateString);
        
        weekDays.push({
          date: new Date(currentDate),
          dateString,
          tasks: dayTasks,
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: dateString === new Date().toISOString().split('T')[0],
          isSelected: dateString === selectedDate.toISOString().split('T')[0],
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekDays);
    }
    
    return weeks;
  }, [currentMonth, tasks, selectedDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const renderDay = (dayInfo: any) => {
    const completedTasks = dayInfo.tasks.filter((t: Task) => t.completed).length;
    const totalTasks = dayInfo.tasks.length;
    const hasHighPriority = dayInfo.tasks.some((t: Task) => t.priority === 'high' && !t.completed);
    
    return (
      <TouchableOpacity
        key={dayInfo.dateString}
        style={[
          styles.dayCell,
          {
            width: cellSize,
            height: cellSize,
            backgroundColor: dayInfo.isSelected
              ? theme.dark ? '#2C2C2E' : '#F2F2F7'
              : 'transparent',
            borderRadius: 12,
          }
        ]}
        onPress={() => onDateSelect(dayInfo.date)}
      >
        {dayInfo.isSelected && (
          <LinearGradient
            colors={['#7745dc', '#f34f8c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
          />
        )}
        
        <Text
          style={[
            styles.dayText,
            {
              color: dayInfo.isCurrentMonth
                ? dayInfo.isSelected
                  ? '#FFFFFF'
                  : dayInfo.isToday
                  ? '#7745dc'
                  : theme.dark ? '#FFFFFF' : '#000000'
                : theme.dark ? '#636366' : '#C7C7CC',
              fontWeight: dayInfo.isToday || dayInfo.isSelected ? '600' : '400',
            },
          ]}
        >
          {dayInfo.date.getDate()}
        </Text>
        
        {/* Индикаторы задач */}
        {totalTasks > 0 && (
          <View style={styles.taskIndicators}>
            {/* Индикатор высокого приоритета */}
            {hasHighPriority && (
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: PRIORITY_COLORS.high }
                ]}
              />
            )}
            
            {/* Прогресс-бар выполнения */}
            {totalTasks > 0 && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      backgroundColor: theme.dark ? '#636366' : '#E5E5EA',
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(completedTasks / totalTasks) * 100}%`,
                        backgroundColor: completedTasks === totalTasks ? '#83be7d' : '#7745dc',
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.taskCount, { 
                  color: dayInfo.isSelected ? '#FFFFFF' : theme.dark ? '#FFFFFF' : '#000000' 
                }]}>
                  {totalTasks}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF' }]}>
      {/* Заголовок с навигацией */}
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          size={24}
          onPress={() => navigateMonth('prev')}
          iconColor={theme.dark ? '#FFFFFF' : '#000000'}
        />
        <Text style={[styles.monthTitle, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
          {MONTHS_RU[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <IconButton
          icon="chevron-right"
          size={24}
          onPress={() => navigateMonth('next')}
          iconColor={theme.dark ? '#FFFFFF' : '#000000'}
        />
      </View>

      {/* Дни недели */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS_RU.map((day) => (
          <View key={day} style={[styles.weekdayCell, { width: cellSize }]}>
            <Text style={[styles.weekdayText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Календарная сетка */}
      <View style={styles.calendarGrid}>
        {calendarData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map(renderDay)}
          </View>
        ))}
      </View>

      {/* Задачи выбранного дня */}
      {selectedDate && (
        <ScrollView style={styles.tasksContainer} showsVerticalScrollIndicator={false}>
          <Text style={[styles.tasksTitle, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
            Задачи на {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </Text>
          
          {tasks
            .filter(task => task.dueDate === selectedDate.toISOString().split('T')[0])
            .map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskItem,
                  {
                    backgroundColor: theme.dark ? '#2C2C2E' : '#F8F9FA',
                    borderLeftColor: PRIORITY_COLORS[task.priority],
                  }
                ]}
                onPress={() => onTaskPress?.(task)}
              >
                <View style={styles.taskContent}>
                  <Text
                    style={[
                      styles.taskTitle,
                      {
                        color: theme.dark ? '#FFFFFF' : '#000000',
                        textDecorationLine: task.completed ? 'line-through' : 'none',
                        opacity: task.completed ? 0.6 : 1,
                      }
                    ]}
                  >
                    {task.title}
                  </Text>
                  <View style={styles.taskMeta}>
                    <View
                      style={[
                        styles.priorityChip,
                        { backgroundColor: PRIORITY_COLORS[task.priority] }
                      ]}
                    />
                    <Text style={[styles.priorityText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
                      {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                    </Text>
                    {task.completed && (
                      <Text style={[styles.completedText, { color: '#83be7d' }]}>
                        ✓ Выполнено
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          
          {tasks.filter(task => task.dueDate === selectedDate.toISOString().split('T')[0]).length === 0 && (
            <Text style={[styles.noTasksText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
              Нет задач на этот день
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 1,
  },
  dayText: {
    fontSize: 16,
    marginBottom: 2,
  },
  taskIndicators: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
    width: '100%',
  },
  priorityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
  },
  progressBar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  taskCount: {
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
    minWidth: 8,
    textAlign: 'center',
  },
  tasksContainer: {
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  taskItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityChip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 12,
    marginRight: 8,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noTasksText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 16,
  },
});