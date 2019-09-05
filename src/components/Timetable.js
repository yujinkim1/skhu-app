import React, { Component } from 'react';
import { View, ScrollView, Text, TouchableHighlight, FlatList } from 'react-native';
import { withNavigation } from 'react-navigation';
import DateTools from '../tools/datetools';
import moment from 'moment';
import {InfoModal} from './infoModal';
import {CardItem} from './components';

const timeTemplate = 'HH:mm:ss';

// professorNameCol: 가끔씩 교수이름 칸만 이름이  다른 경우가 있다.

export function extractFromData(Data, professorNameCol='GyosuNm') {

  return Data.map((item) => {
    return {
      title: item.GwamogKorNm,
      professor: item[professorNameCol],
      room: item.HosilCd,
      day: DateTools.dayOfWeekStrToNum(item.YoilNm),
      starts_at: item.FrTm,
      ends_at: item.ToTm,
      lecture_id: `${item.GwamogCd}-${item.Bunban}`,
      semester_code: item.Haggi,
      year: item.Yy
    };
  });
}

export function convertForTimetable(arr) {
  let displayData = [];
  let calcHeight = (start, end)=>(((end.hour - start.hour) * 60)
                                    + (end.mins - start.mins));

  for(let i=0; i<arr.length; i++){
    let item = arr[i];
    console.log(item);

   
    let minTemplate;
    if (item.starts_at.length == 8 && item.ends_at.length == 8) {
      minTemplate = '08:00:00';
    }
    else {
      minTemplate = '08:00';
    }

    let startsAt = moment(item.starts_at, timeTemplate);
    let startsAtDatetime = {
      hour: startsAt.hours(),
      mins: startsAt.minutes()};

    let endsAt = moment(item.ends_at, timeTemplate);
    let endsAtDatetime = {
      hour: endsAt.hours(),
      mins: endsAt.minutes()};

    let sevenMorning = {hour: 8, mins: 0};

    if(displayData[item.day]==undefined){
      console.log(`init ${item.day}`);
      displayData[item.day] = [];
      displayData[item.day].push({
        isEmptyCell: true,
        time: `${minTemplate} ~ ${item.starts_at}`,
        endsAt: startsAtDatetime,
        name:'',
        room:'',
        height: calcHeight(sevenMorning, startsAtDatetime)
      });
    }else{
      console.log(`add to ${item.day}`);
      let prevEndsAt = displayData[item.day][displayData[item.day].length-1].endsAt;
      displayData[item.day].push({
        isEmptyCell: true,
        time: `${prevEndsAt.hour}:${prevEndsAt.mins} ~ ${item.starts_at}`,
        endsAt: startsAtDatetime,
        name:'',
        room:'',
        height: calcHeight(prevEndsAt, startsAtDatetime)
      });
    }
    
    let lastItem;
    displayData[item.day].forEach((item)=>{
      if(!item.isEmptyCell){
        lastItem = item;
      }
    });
    console.log('lastitem: ' + JSON.stringify(lastItem));
    console.log('current: '+ JSON.stringify(item));
    if(lastItem != undefined && lastItem.time.includes(`${item.starts_at} ~`)){
      console.log('merging duplicates');
      if(Array.isArray(lastItem.name)){
        lastItem.name = [...lastItem.name, item.title];
        lastItem.room = [...lastItem.room, item.room];
        lastItem.syllabus.code = [...lastItem.syllabus.code, item.lecture_id];
      }else{
        lastItem.name = [lastItem.name, item.title];
        lastItem.room = [lastItem.room, item.room];
        lastItem.syllabus.code = [lastItem.syllabus.code, item.lecture_id];
      }
    }else{
      displayData[item.day].push({
        isEmptyCell: false,
        time: `${item.starts_at} ~ ${item.ends_at}`,
        endsAt: endsAtDatetime,
        name: item.title,
        room: item.room,
        height: calcHeight(startsAtDatetime, endsAtDatetime),
        syllabus:{
          code: item.lecture_id,
          semester: item.semester_code,
          year: item.year
        }
      });
    }
  }
  return displayData;
}

class Timetable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      classChooser: false,
      overlappedClasses: []
    };
  }

  render() {
    return (
      <ScrollView style={{backgroundColor: 'whitesmoke'}}>
        <View style={{flex:1, flexDirection: 'row'}}>
          {this.props.timetable.map((item, i)=>{
            return(
              <View style={{flex: 1}}>
                <View style={{height: item.height, backgroundColor: 'white', padding: 2}}>
                  <Text style={{color: 'black'}}>{DateTools.dayOfWeekNumToStr(i)}</Text>
                </View>
                {item.map((subject, j)=>{
                  let bgColor = subject.isEmptyCell ? 'rgba(0, 0, 0, 0)' : 'silver';
                  if(subject.isEmptyCell){
                    return(
                      <View style={{height: subject.height, backgroundColor: bgColor, padding: 2}}
                        key={`subject_${i}_${j}`}>
                      </View>
                    );
                  }else if(Array.isArray(subject.name) && Array.isArray(subject.room)
                    && Array.isArray(subject.syllabus.code)){
                    let more = `및 ${subject.name.length -1}개의 강의`;
                    return(
                      <TouchableHighlight style={{}}
                        key={`subject_${i}_${j}`} onPress={()=>{
                          let overlapped = [];
                          for(let o=0; o<subject.name.length; o++){
                            overlapped.push({
                              name: subject.name[o],
                              code: subject.syllabus.code[o],
                              semester: subject.syllabus.semester,
                              year: subject.syllabus.year
                            });
                          }
                          this.setState({
                            overlappedClasses: overlapped,
                            classChooser: true});
                        }}>
                        <View style={{height: subject.height, backgroundColor: bgColor, padding: 2}}>
                          <Text style={{color: 'black', fontSize: 12}}>{subject.name[0]}</Text>
                          <Text style={{color: 'black', fontSize: 8}}>{subject.time}</Text>
                          <Text style={{color: 'black', fontSize: 8}}>{subject.room[0]}</Text>
                          <Text style={{color: 'black', fontSize: 8}}>{more}</Text>
                        </View>
                      </TouchableHighlight>
                    );
                  }else{
                    return(
                      <TouchableHighlight style={{}}
                        key={`subject_${i}_${j}`} onPress={()=>{
                          this.props.navigation.navigate('SyllabusDetails', {
                            subjectCode: subject.syllabus.code.split('-')[0],
                            classCode: subject.syllabus.code.split('-')[1],
                            semesterCode: subject.syllabus.semester,
                            year: subject.syllabus.year
                          });
                        }}>
                        <View style={{height: subject.height, backgroundColor: bgColor, padding: 2}}>
                          <Text style={{color: 'black', fontSize: 12}}>{subject.name}</Text>
                          <Text style={{color: 'black', fontSize: 8}}>{subject.time}</Text>
                          <Text style={{color: 'black', fontSize: 8}}>{subject.room}</Text>
                        </View>
                      </TouchableHighlight>
                    );
                  }
                })}
              </View>
            );
          })}
          
          <InfoModal
            visible={this.state.classChooser}
            icon='timetable'
            title='강의 선택'
            buttons={[
              {label: '닫기', onPress: ()=>this.setState({classChooser: false})}
            ]}>
            <CardItem style={{alignItems:'center'}}>
              <Text>{this.state.overlappedClasses.length}개의 강의가 같은 시간에 있습니다.</Text>
            </CardItem>
            <FlatList style={{backgroundColor: 'whitesmoke'}}
              data={this.state.overlappedClasses}
              ListFooterComponent={()=>(
                <CardItem style={{height: 50}}/>
              )}
              renderItem={({item})=>
                <CardItem onPress={()=>{
                  this.props.navigation.navigate('SyllabusDetails', {
                    subjectCode: item.code.split('-')[0],
                    classCode: item.code.split('-')[1],
                    semesterCode: item.semester,
                    year: item.year
                  });
                  this.setState({classChooser: false});
                }}>
                  <Text style={{fontWeight: 'bold'}}>{item.name}</Text>
                  <Text>{item.code}</Text>
                </CardItem>
              }
            />
          </InfoModal>
        </View>
      </ScrollView>);
  }
}

export default withNavigation(Timetable);