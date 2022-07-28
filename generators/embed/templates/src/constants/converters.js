/**
 * 1) CONVERTERS should be an array of {upgradeTo, downgradeFrom} objects, where "upgradeTo" and
 * "downgradeFrom" are functions which may be regular, async, or regular that returns a promise
 * 2) Array index of each converter should match the revision (see comments for default converter)
 * 3) For converters to work, current revision should be stated in configDefaults. It's maximal
 * value should never be bigger then last index of this array
 *
 * @type {{upgradeTo: function(object), downgradeFrom: function(object)}[]}
 */
const CONVERTERS = [
  /*
  //version 0
  {
      //-1 to 0
      upgradeTo: async config => {

          // do some async stuff

          return config
      },

      //0 to -1
      downgradeFrom: config => {

          // do some plain stuff

          return config
      }
  }
  */
]

export default CONVERTERS

export {
  CONVERTERS, 
}
